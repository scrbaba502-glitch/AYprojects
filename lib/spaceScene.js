// Real-time 3D space scene for the A² intro — raw WebGL2, zero dependencies.
//
// Look & technique:
//   • HDR rendering (RGBA16F) into a 4× MSAA target, then a modern post chain: dual-filter bloom,
//     anamorphic lens streaks, shockwave refraction, zoom blur, chromatic aberration, filmic shoulder,
//     royal navy/gold colour grade, vignette, film grain and dithering.
//   • A golden A² emblem — extruded in 3D with a bevelled metallic shader — is thrown from deep space
//     (starts ~450 units away as a faint glint, grows exponentially) while the camera chases it.
//   • Procedural Earth (continents with relief shading, clouds, city lights, atmosphere), a huge
//     impact explosion (flash, fireball, sparks, blast ring, shockwave), floating golden bokeh dust.
//
// Usage:  const scene = createSpaceScene(canvas);  // returns null if WebGL2 is unavailable
//         scene.render(tSeconds);                  // call every frame
//         scene.destroy();

import { TL } from "./introTimeline";

/* ----------------------------- tiny math helpers ----------------------------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const norm3 = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

function perspective(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

function lookAt(out, e, c, u) {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
  let l = Math.hypot(zx, zy, zz);
  zx /= l; zy /= l; zz /= l;
  let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx;
  l = Math.hypot(xx, xy, xz);
  xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
  out[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
  out[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
  out[15] = 1;
  return out;
}

function mul(out, a, b) {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function sphereGeometry(lat, lon) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= lat; i++) {
    const th = (i / lat) * Math.PI;
    for (let j = 0; j <= lon; j++) {
      const ph = (j / lon) * Math.PI * 2;
      pos.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
    }
  }
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const a = i * (lon + 1) + j;
      const b = a + lon + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  return { pos: new Float32Array(pos), idx: new Uint16Array(idx) };
}

/* --------------------------------- shaders ---------------------------------- */
const HEAD = "#version 300 es\nprecision highp float;\nprecision highp sampler2D;\n";

const NOISE = `
float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z);
}
float fbm3(vec3 p){ float a=.5,s=0.; for(int i=0;i<3;i++){ s+=a*noise(p); p=p*2.03+vec3(11.7); a*=.5; } return s/.875; }
float fbm4(vec3 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*noise(p); p=p*2.03+vec3(11.7); a*=.5; } return s/.9375; }
float fbm5(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec3(11.7); a*=.5; } return s/.96875; }
float fbm6(vec3 p){ float a=.5,s=0.; for(int i=0;i<6;i++){ s+=a*noise(p); p=p*2.03+vec3(11.7); a*=.5; } return s/.984375; }
`;

const FULLSCREEN_VS = HEAD + `
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2));
  vUv = p; gl_Position = vec4(p*2.-1., 0., 1.);
}`;

const BG_FS = HEAD + NOISE + `
in vec2 vUv; out vec4 o;
uniform float uTime, uExposure; uniform vec2 uRes, uOff;
void main(){
  float asp=uRes.x/uRes.y;
  vec3 p=vec3((vUv-.5)*vec2(asp,1.)*2.2+uOff, uTime*0.012);
  float n=fbm3(p*1.2+3.0), n2=fbm3(p*2.7-7.0);
  vec3 c=vec3(0.008,0.015,0.038);
  c+=vec3(0.115,0.075,0.020)*smoothstep(.42,.86,n)*.85;
  c+=vec3(0.018,0.050,0.125)*smoothstep(.40,.82,n2);
  c+=vec3(0.015,0.040,0.085)*smoothstep(.75,0.,vUv.y)*.7;
  float v=smoothstep(1.3,.25,length((vUv-.5)*vec2(asp*.75,1.)));
  c*=mix(.5,1.,v);
  o=vec4(c*uExposure,1.);
}`;

const STAR_VS = HEAD + `
in vec2 aCorner; in vec3 aPos; in vec3 aMisc;
uniform mat4 uVP; uniform vec2 uRes; uniform float uTime, uDpr;
out vec2 vC; out vec3 vCol; out float vA;
void main(){
  vec4 c=uVP*vec4(aPos,1.);
  float tw=.72+.28*sin(uTime*(1.4+aMisc.z*3.)+aMisc.z*40.);
  float px=aMisc.x*uDpr*(.9+.2*tw);
  c.xy+=aCorner*px*2./uRes*c.w;
  gl_Position=c; vC=aCorner; vA=tw;
  vCol=mix(vec3(.78,.88,1.),vec3(1.,.86,.55),aMisc.y);
}`;
const STAR_FS = HEAD + `
in vec2 vC; in vec3 vCol; in float vA; out vec4 o; uniform float uExposure;
void main(){ float d=length(vC); float a=smoothstep(1.,0.,d); a*=a; o=vec4(vCol*a*vA*uExposure*1.15,1.); }`;

const EARTH_VS = HEAD + `
in vec3 aPos; uniform mat4 uVP; uniform vec3 uCenter; uniform float uR;
out vec3 vN; out vec3 vW;
void main(){ vN=aPos; vW=uCenter+aPos*uR; gl_Position=uVP*vec4(vW,1.); }`;

/* One-time bake of the procedural planet into two cubemaps (so the per-frame Earth shader is just a few fetches):
     A = albedo.rgb + ocean mask          B = height, cloud density, city lights, land mask */
const BAKE_FS = HEAD + NOISE + `
in vec2 vUv;
layout(location=0) out vec4 oA;
layout(location=1) out vec4 oB;
uniform int uFace;
vec3 faceDir(int f, vec2 st){
  if(f==0) return vec3( 1.,-st.y,-st.x);
  if(f==1) return vec3(-1.,-st.y, st.x);
  if(f==2) return vec3( st.x, 1., st.y);
  if(f==3) return vec3( st.x,-1.,-st.y);
  if(f==4) return vec3( st.x,-st.y, 1.);
  return vec3(-st.x,-st.y,-1.);
}
void main(){
  vec3 p=normalize(faceDir(uFace, vUv*2.-1.));
  float lat=abs(p.y);

  // continents: domain-warped fractal noise, plus fine coastline detail
  vec3 w=vec3(fbm3(p*1.3+vec3(5.2,1.3,8.1)),fbm3(p*1.3+vec3(1.7,9.2,3.4)),fbm3(p*1.3+vec3(8.3,2.8,6.6)))-.5;
  float h=fbm6(p*1.55+w*.6+vec3(2.3,1.1,4.7));
  h+=(fbm4(p*9.+3.)-.5)*.05;
  float sea=.545;
  float land=smoothstep(sea,sea+.009,h);
  float depth=clamp((sea-h)/.30,0.,1.);
  float elev=clamp((h-sea)/(1.-sea),0.,1.);

  // oceans: turquoise shelf fading into deep navy
  vec3 ocean=mix(vec3(.030,.34,.40),vec3(.004,.028,.115),pow(smoothstep(0.,.42,depth),.55));
  ocean+=vec3(.05,.13,.13)*smoothstep(.05,0.,sea-h)*(1.-land);

  // land biomes
  float moist=fbm4(p*3.2+9.);
  float dry=smoothstep(.54,.36,moist)*smoothstep(.78,.30,lat);
  vec3 lc=mix(vec3(.06,.19,.07),vec3(.30,.38,.14),smoothstep(.42,.60,moist));
  lc=mix(lc,vec3(.70,.56,.34),dry);
  lc=mix(lc,vec3(.40,.40,.32),smoothstep(.62,.80,lat));
  lc=mix(lc,vec3(.36,.32,.28),smoothstep(.08,.34,elev));
  float snow=smoothstep(.30,.44,elev+(lat-.5)*.25);
  float ice=smoothstep(.82,.90,lat+(fbm3(p*6.)-.5)*.1);
  lc=mix(lc,vec3(.93,.96,1.),max(snow,ice));
  lc*=.82+.36*fbm4(p*42.);
  ocean=mix(ocean,vec3(.86,.92,1.),smoothstep(.86,.93,lat));

  vec3 alb=mix(ocean,lc,land);
  float oceanMask=(1.-land)*(1.-smoothstep(.86,.93,lat));

  // clouds (warped so they swirl)
  vec3 cw=vec3(fbm3(p*2.+3.),fbm3(p*2.+7.),fbm3(p*2.+11.))-.5;
  float cl=fbm5(p*4.+cw*1.3+vec3(7.,3.,1.));
  float clouds=smoothstep(.52,.80,cl)*.97;

  // night-side city lights, denser near coasts
  float lights=land*(1.-ice)*smoothstep(.62,.78,fbm3(p*14.+5.))*smoothstep(.55,.0,elev*3.);

  oA=vec4(alb,oceanMask);
  oB=vec4(h,clouds,lights,land);
}`;

const EARTH_FS = HEAD + `
in vec3 vN; in vec3 vW; out vec4 o;
uniform samplerCube uA, uB;
uniform vec3 uCam, uLight, uImpactN, uMPos; uniform vec2 uLs;
uniform float uTime, uShock, uShockA, uCrater, uMLight, uExposure, uBumpK;
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float hsh(vec3 p){ p=fract(p*.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
void main(){
  vec3 n=normalize(vN);
  vec3 V=normalize(uCam-vW);
  vec3 p=n; p.yz=rot(-1.1)*p.yz; p.xz=rot(uTime*.035)*p.xz;
  vec4 A=texture(uA,p);
  vec4 B=texture(uB,p);
  float h=B.r, land=B.a, ocean=A.a;

  vec3 Lp=uLight; Lp.yz=rot(-1.1)*Lp.yz; Lp.xz=rot(uTime*.035)*Lp.xz;
  vec3 pc=p; pc.xz=rot(uTime*.012)*pc.xz;                    // clouds drift relative to the ground
  float clouds=texture(uB,pc).g;
  float cshadow=texture(uB,normalize(pc+Lp*.022)).g;         // cloud shadows on the surface

  float d=dot(n,uLight);
  float day=smoothstep(-.12,.28,d);
  float dif=max(d,0.);
  vec3 surf=A.rgb;
  vec3 col=surf*(.03+dif*.97*(1.-cshadow*.5))+surf*vec3(.02,.04,.09)*(1.-day);

  // relief shading on land from the baked height field
  float bump=clamp((dFdx(h)*uLs.x+dFdy(h)*uLs.y)*uBumpK,-.3,.3);
  col*=1.+bump*land*(.35+dif);

  // oceans: sun glint + sky reflection at grazing angles
  vec3 H=normalize(uLight+V);
  float fr0=pow(1.-max(dot(n,V),0.),4.);
  col+=vec3(1.,.93,.80)*pow(max(dot(n,H),0.),140.)*ocean*1.3*day*(1.-clouds);
  col+=vec3(.10,.22,.45)*fr0*ocean*day*.5;

  // clouds
  float term=smoothstep(.20,0.,abs(d-.02));
  vec3 ccol=vec3(1.)*(.05+dif*.95)+vec3(1.,.55,.25)*term*.10;
  col=mix(col,ccol,clouds*.9);

  // warm band along the terminator
  col+=vec3(1.,.48,.18)*term*.09*(1.-clouds*.5)*(.4+.6*land);

  // city lights on the night side
  col+=vec3(1.,.72,.32)*B.b*(1.-day)*(1.-clouds*.75)*.95;

  float fr=pow(1.-max(dot(n,V),0.),3.);
  col+=vec3(.25,.55,1.)*fr*(.15+.85*day)*.55;

  // A² light + impact effects
  vec3 tm=uMPos-vW; float dm=length(tm);
  col+=vec3(1.,.6,.25)*uMLight*max(dot(n,tm/dm),0.)/(1.+dm*dm*.35);
  float ang=acos(clamp(dot(n,uImpactN),-1.,1.));
  float ring=exp(-pow((ang-uShock)/.035,2.))+.5*exp(-pow((ang-uShock*.62)/.05,2.));
  col+=vec3(1.,.72,.34)*ring*uShockA*.85;
  float cg=exp(-ang*ang/.0042)*uCrater;
  col+=vec3(1.,.45,.10)*cg*(.8+.3*sin(dot(n,vec3(61.,47.,53.))+3.*sin(dot(n,vec3(29.,71.,37.)))));

  col=1.-exp(-col*1.25*uExposure);
  o=vec4(pow(col,vec3(1./2.2)),1.);
}`;

const ATMO_FS = HEAD + `
in vec3 vN; in vec3 vW; out vec4 o;
uniform vec3 uCam, uLight; uniform float uLimb, uAtmo, uExposure;
void main(){
  vec3 n=normalize(vN); vec3 V=normalize(uCam-vW);
  float k=clamp(-dot(n,V)/uLimb,0.,1.);
  float i=pow(k,2.3);
  float sd=dot(n,uLight);
  float sun=.22+.78*smoothstep(-.35,.45,sd);
  vec3 c=mix(vec3(.22,.50,1.),vec3(.6,.84,1.),pow(k,7.))*i*sun*uAtmo*uExposure;
  c+=vec3(1.,.5,.2)*i*smoothstep(.3,0.,abs(sd))*.35*uExposure;   // sunset-coloured limb at the terminator
  o=vec4(c,1.);
}`;

/* ---- A² emblem: instanced extrusion layers + bevelled metallic front face ---- */
const GLYPH_VS = HEAD + `
in vec2 aCorner; uniform mat4 uVP; uniform vec3 uPos; uniform vec2 uRes;
uniform float uPx, uYaw, uPitch, uRoll, uLayers, uThick;
out vec2 vUv; out float vL;
void main(){
  float f=float(gl_InstanceID)/(uLayers-1.);          // 0 = back, 1 = front face
  vec4 c=uVP*vec4(uPos,1.);
  vec2 q=aCorner;
  q-=vec2(sin(uYaw), sin(uPitch)*.8)*(1.-f)*uThick;   // extrusion depth shows up when the emblem tumbles
  float z=q.x*sin(uYaw)+q.y*sin(uPitch);
  float persp=1./(1.-z*.2);
  q=vec2(q.x*cos(uYaw), q.y*cos(uPitch))*persp;
  float cr=cos(uRoll), sr=sin(uRoll);
  q=vec2(q.x*cr-q.y*sr, q.x*sr+q.y*cr);
  c.xy+=q*uPx*2./uRes*c.w;
  gl_Position=c; vUv=aCorner*.5+.5; vL=f;
}`;
const GLYPH_FS = HEAD + `
in vec2 vUv; in float vL; out vec4 o;
uniform sampler2D uTex; uniform float uInt, uHeat, uTime, uYaw, uPitch;
void main(){
  float a=texture(uTex,vUv).a;
  if(a<.004) discard;
  vec3 col;
  if(vL>.999){
    float e3=.011, e5=.032;
    float hx=(textureLod(uTex,vUv+vec2(e3,0.),3.).a-textureLod(uTex,vUv-vec2(e3,0.),3.).a)*3.0
            +(textureLod(uTex,vUv+vec2(e5,0.),5.).a-textureLod(uTex,vUv-vec2(e5,0.),5.).a)*4.2;
    float hy=(textureLod(uTex,vUv+vec2(0.,e3),3.).a-textureLod(uTex,vUv-vec2(0.,e3),3.).a)*3.0
            +(textureLod(uTex,vUv+vec2(0.,e5),5.).a-textureLod(uTex,vUv-vec2(0.,e5),5.).a)*4.2;
    vec3 n=normalize(vec3(-hx+uYaw*.35,-hy+uPitch*.35,1.));
    vec3 Lr=normalize(vec3(-.45,.65,.62));
    vec3 R=reflect(vec3(0.,0.,-1.),n);
    float env=smoothstep(-.35,.85,R.y+.25*sin(uTime*1.3)+R.x*.2);
    vec3 gold=mix(vec3(.30,.17,.04),vec3(1.,.80,.40),env);
    gold=mix(gold,vec3(1.,.95,.78),smoothstep(.75,1.,env)*.55);
    float diff=max(dot(n,Lr),0.);
    float spec=pow(max(dot(R,Lr),0.),26.);
    float rim=smoothstep(.04,.30,length(vec2(hx,hy)));
    col=gold*(.62+.55*diff)+vec3(1.,.93,.7)*(spec*1.2+rim*.30);
    float band=exp(-pow((vUv.x*.7+vUv.y*.7-fract(uTime*.4)*2.2+.35)/.06,2.));   // light sweeping over the gold
    col+=vec3(1.,.9,.65)*band*.9;
  } else {
    col=mix(vec3(.16,.08,.02),vec3(.62,.38,.10),vL)*(.8+.2*sin(vUv.y*40.));      // extruded side wall
  }
  col=mix(col,col*vec3(1.3,.72,.38)+vec3(.30,.09,.0),uHeat*.55);                  // heats up as it enters the atmosphere
  col*=uInt;
  o=vec4(col*a,a);
}`;

const SPRITE_VS = HEAD + `
in vec2 aCorner; uniform mat4 uVP; uniform vec3 uPos; uniform float uSize, uMinPx, uProj; uniform vec2 uRes;
out vec2 vC;
void main(){
  vec4 c=uVP*vec4(uPos,1.);
  float px=max(uMinPx,uSize*uProj/max(c.w,.01));
  c.xy+=aCorner*px*2./uRes*c.w;
  gl_Position=c; vC=aCorner;
}`;
const SPRITE_FS = HEAD + `
in vec2 vC; out vec4 o; uniform vec3 uColor; uniform float uInt, uStreak, uCross;
void main(){
  float d=length(vC);
  float core=exp(-d*d*30.);
  float halo=exp(-d*3.6)*.5*smoothstep(1.,.55,d);
  float streak=exp(-abs(vC.y)*22.)*exp(-abs(vC.x)*2.4)*.55*uStreak*smoothstep(1.,.5,abs(vC.x))*smoothstep(1.,.6,abs(vC.y));
  float vstreak=exp(-abs(vC.x)*26.)*exp(-abs(vC.y)*3.0)*.45*uCross*smoothstep(1.,.5,abs(vC.y))*smoothstep(1.,.6,abs(vC.x));
  o=vec4(uColor*(core*1.6+halo+streak+vstreak)*uInt,1.);
}`;

const TAIL_VS = HEAD + `
in vec2 aCorner; in vec4 aRand;
uniform mat4 uVP; uniform vec2 uRes; uniform float uProj, uDpr, uTime, uLen, uSpread, uHeat, uAlive, uSize;
uniform vec3 uMPos, uDir, uP1, uP2;
out vec2 vC; out float vS; out float vA;
void main(){
  float s=fract(aRand.x+uTime*(.55+aRand.y*.4));
  vec3 off=(uP1*(aRand.y-.5)*2.+uP2*(aRand.z-.5)*2.)*uSpread*s;
  vec3 pos=uMPos+uDir*(s*uLen)+off;
  vec4 c=uVP*vec4(pos,1.);
  float size=mix(.12,.02,s)*(.6+aRand.w*.8)*uSize;
  float px=max(1.3*uDpr,size*uProj/max(c.w,.01));
  c.xy+=aCorner*px*2./uRes*c.w;
  gl_Position=c; vC=aCorner; vS=s;
  vA=(1.-s)*(1.-s)*uAlive*(.35+.65*uHeat);
}`;
const TAIL_FS = HEAD + `
in vec2 vC; in float vS; in float vA; out vec4 o;
void main(){
  float d=length(vC); float a=smoothstep(1.,0.,d); a*=a;
  vec3 col=mix(vec3(1.,.96,.82),vec3(1.,.55,.12),smoothstep(0.,.35,vS));
  col=mix(col,vec3(.55,.12,.03),smoothstep(.35,1.,vS));
  o=vec4(col*a*vA*.6,1.);
}`;

const DEBRIS_VS = HEAD + `
in vec2 aCorner; in vec4 aRand;
uniform mat4 uVP; uniform vec2 uRes; uniform float uDpr, uBurst;
uniform vec3 uImpP, uImpN, uT1, uT2;
out vec2 vC; out float vA; out float vH;
void main(){
  float life=1.6+aRand.w*2.4;
  float t=uBurst;
  float a=1.-t/life;
  if(t<0.||a<=0.){ gl_Position=vec4(2.,2.,2.,1.); vC=vec2(0.); vA=0.; vH=0.; return; }
  float ang=aRand.x*6.2831853;
  float spd=.7+aRand.y*1.9;
  vec3 dir=normalize(uImpN*(.6+aRand.z*.9)+(uT1*cos(ang)+uT2*sin(ang))*(.5+aRand.y));
  vec3 pos=uImpP+dir*spd*t*(1.-.3*t)-uImpN*.9*t*t;
  vec4 c=uVP*vec4(pos,1.);
  float px=(2.2+aRand.z*5.5)*uDpr*(.4+a);
  c.xy+=aCorner*px*2./uRes*c.w;
  gl_Position=c; vC=aCorner; vA=a; vH=a;
}`;
const DEBRIS_FS = HEAD + `
in vec2 vC; in float vA; in float vH; out vec4 o;
void main(){
  float d=length(vC); float a=smoothstep(1.,0.,d); a*=a;
  vec3 col=mix(vec3(.8,.2,.05),vec3(1.,.9,.6),vH);
  o=vec4(col*a*vA*1.6,1.);
}`;

const FLASH_FS = HEAD + `
in vec2 vUv; out vec4 o; uniform float uFlash; uniform vec2 uC, uRes, uRing;
void main(){
  float asp=uRes.x/uRes.y;
  float d=length((vUv-uC)*vec2(asp,1.));
  float f=uFlash*(.04+1.0*exp(-d*5.2));
  f+=uRing.y*exp(-pow((d-uRing.x)/(.010+.022*uRing.x),2.))*.9;
  o=vec4(vec3(1.,.88,.62)*f,1.);
}`;

/* ---- golden bokeh dust drifting through the frame ---- */
const MOTE_VS = HEAD + `
in vec2 aCorner; in vec4 aM;
uniform mat4 uVP; uniform vec2 uRes; uniform float uTime, uProj, uAmt, uDpr;
out vec2 vC; out float vA; out float vK;
void main(){
  vec3 b=aM.xyz;
  vec3 pos=vec3(b.x*8.,b.y*4.6,b.z*5.+1.)+vec3(sin(uTime*.21+b.y*9.),cos(uTime*.17+b.x*7.),sin(uTime*.13+b.z*5.))*.35;
  vec4 c=uVP*vec4(pos,1.);
  float depth=max(c.w,.5);
  float spk=1.-step(.04,aM.w);                                  // tiny specks vs. a few soft bokeh discs
  float px=max(aM.w*uProj/depth, spk*1.7*uDpr);
  c.xy+=aCorner*px*2./uRes*c.w;
  gl_Position=c; vC=aCorner; vK=1.-spk;
  float tw=.6+.4*sin(uTime*(.7+aM.w*5.)+b.x*20.);
  vA=uAmt*tw*smoothstep(.3,2.5,depth)*(.5+3.*aM.w);
}`;
const MOTE_FS = HEAD + `
in vec2 vC; in float vA; in float vK; out vec4 o;
void main(){
  float d=length(vC);
  float disc=smoothstep(1.,.88,d);
  float rim=smoothstep(.5,.95,d)*disc;
  float spark=exp(-d*d*5.);
  o=vec4(vec3(1.,.80,.48)*mix(spark*1.5, disc*.30+rim*.28, vK)*vA,1.);
}`;

/* ---- post-processing ---- */
const DOWN_FS = HEAD + `
in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel; uniform float uFirst, uThresh, uKnee;
vec3 s(vec2 off){ return texture(uTex, vUv+off*uTexel).rgb; }
void main(){
  vec3 a=s(vec2(-2,2)), b=s(vec2(0,2)), c=s(vec2(2,2));
  vec3 d=s(vec2(-2,0)), e=s(vec2(0,0)), f=s(vec2(2,0));
  vec3 g=s(vec2(-2,-2)), h=s(vec2(0,-2)), i=s(vec2(2,-2));
  vec3 j=s(vec2(-1,1)), k=s(vec2(1,1)), l=s(vec2(-1,-1)), m=s(vec2(1,-1));
  vec3 col=e*.125+(a+c+g+i)*.03125+(b+d+f+h)*.0625+(j+k+l+m)*.125;
  if(uFirst>.5){
    float br=max(col.r,max(col.g,col.b));
    float soft=clamp(br-uThresh+uKnee,0.,2.*uKnee);
    soft=soft*soft/(4.*uKnee+1e-4);
    col*=max(soft,br-uThresh)/max(br,1e-4);
  }
  o=vec4(col,1.);
}`;
const UP_FS = HEAD + `
in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel; uniform float uW;
vec3 s(vec2 off){ return texture(uTex, vUv+off*uTexel).rgb; }
void main(){
  vec3 col=s(vec2(0,0))*4.+(s(vec2(0,1))+s(vec2(-1,0))+s(vec2(1,0))+s(vec2(0,-1)))*2.
          +s(vec2(-1,1))+s(vec2(1,1))+s(vec2(-1,-1))+s(vec2(1,-1));
  o=vec4(col/16.*uW,1.);
}`;
const ANA_FS = HEAD + `
in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel; uniform float uStride, uThresh;
void main(){
  vec3 acc=vec3(0.); float ws=0.;
  for(int i=-7;i<=7;i++){
    float f=float(i); float w=exp(-f*f/18.);
    vec3 c=texture(uTex, vUv+vec2(f*uStride*uTexel.x,0.)).rgb;
    acc+=max(c-uThresh,0.)*w; ws+=w;
  }
  o=vec4(acc/ws,1.);
}`;
const COMP_FS = HEAD + `
in vec2 vUv; out vec4 o;
uniform sampler2D uScene, uBloom, uAna;
uniform vec2 uRes, uImp, uRing;
uniform float uTime, uBloomAmt, uAnaAmt, uCA, uZoom, uVig, uGrain;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 uv=vUv;
  float asp=uRes.x/uRes.y;
  // shockwave refraction ripple
  vec2 dv=(uv-uImp)*vec2(asp,1.);
  float d=length(dv);
  float w=exp(-pow((d-uRing.x)/(.028+.05*uRing.x),2.));
  uv+=dv/(d+1e-4)/vec2(asp,1.)*w*uRing.y*.022*sin((d-uRing.x)*70.);
  vec2 ca=(uv
