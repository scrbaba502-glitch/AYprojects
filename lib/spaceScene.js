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
  vec3 c=vec3(0.0035,0.0045,0.008);
  c+=vec3(0.006,0.008,0.013)*smoothstep(.45,.9,n);
  c+=vec3(0.004,0.007,0.014)*smoothstep(.5,.9,n2);
  c+=vec3(0.006,0.011,0.022)*smoothstep(.8,0.,vUv.y)*.8;
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
  vCol=mix(vec3(.82,.88,1.),vec3(1.,.95,.88),aMisc.y*.45);
}`;
const STAR_FS = HEAD + `
in vec2 vC; in vec3 vCol; in float vA; out vec4 o; uniform float uExposure;
void main(){ float d=length(vC); float a=smoothstep(1.,0.,d); a*=a; o=vec4(vCol*a*vA*uExposure*.95,1.); }`;

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
  vec3 ccol=vec3(1.)*(.05+dif*.95)+vec3(1.,.6,.4)*term*.04;
  col=mix(col,ccol,clouds*.9);

  // warm band along the terminator
  col+=vec3(1.,.55,.30)*term*.03*(1.-clouds*.5)*(.4+.6*land);

  // city lights on the night side
  col+=vec3(1.,.72,.32)*B.b*(1.-day)*(1.-clouds*.75)*.95;

  float fr=pow(1.-max(dot(n,V),0.),3.);
  col+=vec3(.25,.50,.95)*fr*(.15+.85*day)*.38;

  // A² light + impact effects
  vec3 tm=uMPos-vW; float dm=length(tm);
  col+=vec3(.92,.94,1.)*uMLight*.55*max(dot(n,tm/dm),0.)/(1.+dm*dm*.35);
  float ang=acos(clamp(dot(n,uImpactN),-1.,1.));
  float ring=exp(-pow((ang-uShock)/.035,2.))+.5*exp(-pow((ang-uShock*.62)/.05,2.));
  col+=vec3(.90,.94,1.)*ring*uShockA*.55;
  float cg=exp(-ang*ang/.0042)*uCrater;
  col+=vec3(1.,.66,.40)*cg*.55*(.8+.3*sin(dot(n,vec3(61.,47.,53.))+3.*sin(dot(n,vec3(29.,71.,37.)))));

  float lum=dot(col,vec3(.2126,.7152,.0722));
  col=mix(vec3(lum),col,.74);                                 // restrained, less saturated
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
  c+=vec3(1.,.55,.3)*i*smoothstep(.3,0.,abs(sd))*.10*uExposure;   // sunset-coloured limb at the terminator
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
    vec3 n=normalize(vec3(-hx*.5+uYaw*.3,-hy*.5+uPitch*.3,1.));
    vec3 Lr=normalize(vec3(-.45,.65,.62));
    vec3 R=reflect(vec3(0.,0.,-1.),n);
    float env=smoothstep(-.35,.85,R.y+.25*sin(uTime*1.3)+R.x*.2);
    vec3 steel=mix(vec3(.07,.08,.10),vec3(.90,.93,.98),env);
    steel=mix(steel,vec3(1.),smoothstep(.8,1.,env)*.45);
    float diff=max(dot(n,Lr),0.);
    float spec=pow(max(dot(R,Lr),0.),34.);
    float rim=smoothstep(.04,.30,length(vec2(hx,hy)));
    col=steel*(.55+.55*diff)+vec3(1.)*(spec*1.0+rim*.20);
  } else {
    col=mix(vec3(.03,.035,.045),vec3(.30,.32,.38),vL)*(.85+.15*sin(vUv.y*40.));      // extruded side wall
  }
  col=mix(col,col*vec3(1.12,.88,.72)+vec3(.10,.04,.0),uHeat*.30);                  // heats up as it enters the atmosphere
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
  vec3 col=mix(vec3(.96,.97,1.),vec3(.52,.66,1.),smoothstep(0.,.4,vS));
  col=mix(col,vec3(.10,.16,.38),smoothstep(.4,1.,vS));
  o=vec4(col*a*vA*.34,1.);
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
  float px=(1.6+aRand.z*3.4)*uDpr*(.4+a);
  c.xy+=aCorner*px*2./uRes*c.w;
  gl_Position=c; vC=aCorner; vA=a; vH=a;
}`;
const DEBRIS_FS = HEAD + `
in vec2 vC; in float vA; in float vH; out vec4 o;
void main(){
  float d=length(vC); float a=smoothstep(1.,0.,d); a*=a;
  vec3 col=mix(vec3(.55,.34,.20),vec3(1.,.95,.88),vH);
  o=vec4(col*a*vA*a*.55,1.);
}`;

const FLASH_FS = HEAD + `
in vec2 vUv; out vec4 o; uniform float uFlash; uniform vec2 uC, uRes, uRing;
void main(){
  float asp=uRes.x/uRes.y;
  float d=length((vUv-uC)*vec2(asp,1.));
  float f=uFlash*(.04+1.0*exp(-d*5.2));
  f+=uRing.y*exp(-pow((d-uRing.x)/(.005+.012*uRing.x),2.))*.8;
  o=vec4(vec3(.96,.97,1.)*f,1.);
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
  vec2 ca=(uv-.5)*uCA;
  vec3 col;
  if(uZoom>.002){
    vec2 dir=(uImp-uv)*uZoom; vec3 acc=vec3(0.);
    for(int i=0;i<12;i++){ acc+=texture(uScene,uv+dir*(float(i)/11.)).rgb; }
    col=acc/12.;
  } else col=texture(uScene,uv).rgb;
  col.r=mix(col.r,texture(uScene,uv-ca).r,.9);
  col.b=mix(col.b,texture(uScene,uv+ca).b,.9);
  col+=texture(uBloom,uv).rgb*uBloomAmt;
  col+=texture(uAna,uv).rgb*uAnaAmt*vec3(.9,.95,1.);
  // filmic highlight shoulder
  vec3 hi=max(col-.78,0.); col=min(col,vec3(.78))+.22*(1.-exp(-hi/.22));
  // royal grade: cool navy shadows, warm gold highlights, a touch of contrast
  float l=dot(col,vec3(.2126,.7152,.0722));
  col=mix(col,col*vec3(.97,.99,1.04),1.-smoothstep(0.,.3,l));
  col=mix(vec3(l),col,1.0);
  col=col*col*(3.-2.*col)*.32+col*.68;
  float v=smoothstep(1.2,.3,length((vUv-.5)*vec2(asp*.85,1.)));
  col*=mix(1.-uVig,1.,v);
  col+=(h21(vUv*uRes+fract(uTime*7.31)*91.7)-.5)*uGrain;     // film grain
  col+=(h21(vUv*uRes*1.37+3.1)-.5)/255.;                      // dither (no banding in the dark gradients)
  o=vec4(max(col,0.),1.);
}`;

/* ------------------------------ GL boilerplate ------------------------------ */
function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error("Shader compile failed: " + log);
  }
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Program link failed: " + gl.getProgramInfoLog(p));
  gl.deleteShader(v);
  gl.deleteShader(f);
  const cache = {};
  p.u = (name) => (name in cache ? cache[name] : (cache[name] = gl.getUniformLocation(p, name)));
  return p;
}

/* ---------------------------------- scene ----------------------------------- */
export function createSpaceScene(canvas, options = {}) {
  let gl;
  try {
    gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: true, powerPreference: "high-performance" });
  } catch (e) {
    gl = null;
  }
  if (!gl) return null;

  let progs;
  try {
    progs = {
      bg: program(gl, FULLSCREEN_VS, BG_FS),
      star: program(gl, STAR_VS, STAR_FS),
      bake: program(gl, FULLSCREEN_VS, BAKE_FS),
      earth: program(gl, EARTH_VS, EARTH_FS),
      atmo: program(gl, EARTH_VS, ATMO_FS),
      glyph: program(gl, GLYPH_VS, GLYPH_FS),
      sprite: program(gl, SPRITE_VS, SPRITE_FS),
      tail: program(gl, TAIL_VS, TAIL_FS),
      debris: program(gl, DEBRIS_VS, DEBRIS_FS),
      flash: program(gl, FULLSCREEN_VS, FLASH_FS),
      mote: program(gl, MOTE_VS, MOTE_FS),
      down: program(gl, FULLSCREEN_VS, DOWN_FS),
      up: program(gl, FULLSCREEN_VS, UP_FS),
      ana: program(gl, FULLSCREEN_VS, ANA_FS),
      comp: program(gl, FULLSCREEN_VS, COMP_FS),
    };
  } catch (e) {
    if (options.onError) options.onError(e);
    return null;
  }

  const FOV0 = (45 * Math.PI) / 180;
  const LIGHT = norm3([-0.55, 0.45, 0.7]);
  let dprWanted = clamp(options.dpr || Math.min(window.devicePixelRatio || 1, 2), 0.6, 2);
  let dpr = dprWanted;
  let W = 1, H = 1, aspect = 1;
  let fov = FOV0;

  // float render targets: true HDR when the extension exists, else 8-bit
  const hdr = !!gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("OES_texture_float_linear");
  const T_INT = hdr ? gl.RGBA16F : gl.RGBA8;
  const T_TYPE = hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
  const MSAA = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0);

  // geometry
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const earthGeo = sphereGeometry(80, 128);
  function meshBuffers(g) {
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, g.pos, gl.STATIC_DRAW);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);
    return { vb, ib, n: g.idx.length };
  }
  const earthMesh = meshBuffers(earthGeo);

  // deterministic pseudo-random so the intro looks identical every time
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const STARS = 2200;
  const starData = new Float32Array(STARS * 6);
  for (let i = 0; i < STARS; i++) {
    const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    const rad = 90 + rnd() * 20;
    starData.set([r * Math.cos(a) * rad, z * rad, r * Math.sin(a) * rad, 0.7 + Math.pow(rnd(), 6) * 2.8, rnd() < 0.22 ? 1 : rnd() * 0.3, rnd()], i * 6);
  }
  const starBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
  gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);

  const TAIL_N = 900;
  const tailData = new Float32Array(TAIL_N * 4);
  for (let i = 0; i < TAIL_N * 4; i++) tailData[i] = rnd();
  const tailBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tailBuf);
  gl.bufferData(gl.ARRAY_BUFFER, tailData, gl.STATIC_DRAW);

  const DEB_N = 760;
  const debData = new Float32Array(DEB_N * 4);
  for (let i = 0; i < DEB_N * 4; i++) debData[i] = rnd();
  const debBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, debBuf);
  gl.bufferData(gl.ARRAY_BUFFER, debData, gl.STATIC_DRAW);

  const MOTE_N = 170;
  const moteData = new Float32Array(MOTE_N * 4);
  for (let i = 0; i < MOTE_N; i++) {
    moteData.set([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1, rnd() < 0.12 ? 0.045 + rnd() * 0.05 : 0.005 + rnd() * 0.016], i * 4);
  }
  const moteBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, moteBuf);
  gl.bufferData(gl.ARRAY_BUFFER, moteData, gl.STATIC_DRAW);

  // scene state recomputed on resize
  const proj = new Float32Array(16);
  const view = new Float32Array(16);
  const vp = new Float32Array(16);
  let earthR = 4, earthC = [0, -5, 0];
  const arr = { eye: [0, 0.15, 7.3], target: [0, -1.5, 0], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, -1] };
  let impactP = [0, 0, 0], impactN = [0, 1, 0], impactT1 = [1, 0, 0], impactT2 = [0, 0, 1], impactNdc = [0.5, 0.35];
  let projScale = 1;

  function rayEarth(ndcX, ndcY) {
    // camera at (0,0,BASE) looking down -z
    const BASE = 7;
    const th = Math.tan(FOV0 / 2);
    const dir = norm3([ndcX * th * aspect, ndcY * th, -1]);
    const o = [0, 0, BASE];
    const oc = [o[0] - earthC[0], o[1] - earthC[1], o[2] - earthC[2]];
    const b = oc[0] * dir[0] + oc[1] * dir[1] + oc[2] * dir[2];
    const c = oc[0] * oc[0] + oc[1] * oc[1] + oc[2] * oc[2] - earthR * earthR;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return [o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t];
  }

  function layout() {
    const BASE = 7;
    const halfH = Math.tan(FOV0 / 2) * BASE;
    const halfW = halfH * aspect;
    earthR = clamp(halfW * 0.95, 3.4, 7.5);
    earthC = [0, (aspect < 1 ? -0.12 : -0.3) * halfH - earthR, 0];
    // arrival camera: looks a little below the Earth's limb so the whole upper face of the planet is in frame
    arr.eye = [0, 0.15, 13.5]; // starts far back and dollies in during the impact
    arr.target = [0, -0.15 - 0.2 * halfH, 0];
    const f = norm3([arr.target[0] - arr.eye[0], arr.target[1] - arr.eye[1], arr.target[2] - arr.eye[2]]);
    arr.r = norm3(cross(f, [0, 1, 0]));
    arr.u = cross(arr.r, f);
    arr.f = f;
    const thA = Math.tan((35 * Math.PI) / 360);
    function rayA(nx, ny) {
      const d = norm3([f[0] + arr.r[0] * nx * thA * aspect + arr.u[0] * ny * thA, f[1] + arr.r[1] * nx * thA * aspect + arr.u[1] * ny * thA, f[2] + arr.r[2] * nx * thA * aspect + arr.u[2] * ny * thA]);
      const oc = [arr.eye[0] - earthC[0], arr.eye[1] - earthC[1], arr.eye[2] - earthC[2]];
      const bb = oc[0] * d[0] + oc[1] * d[1] + oc[2] * d[2];
      const cc = oc[0] * oc[0] + oc[1] * oc[1] + oc[2] * oc[2] - earthR * earthR;
      const ds = bb * bb - cc;
      if (ds < 0) return null;
      const tt = -bb - Math.sqrt(ds);
      return [arr.eye[0] + d[0] * tt, arr.eye[1] + d[1] * tt, arr.eye[2] + d[2] * tt];
    }
    impactNdc = [aspect < 1 ? 0.02 : 0.05, aspect < 1 ? -0.2 : -0.14];
    let P = rayA(impactNdc[0], impactNdc[1]);
    for (let k = 0; !P && k < 12; k++) {
      impactNdc = [impactNdc[0], impactNdc[1] - 0.06];
      P = rayA(impactNdc[0], impactNdc[1]);
    }
    if (!P) P = [0, earthC[1] + earthR, earthR * 0.2];
    impactP = P;
    impactN = norm3([P[0] - earthC[0], P[1] - earthC[1], P[2] - earthC[2]]);
    const up = Math.abs(impactN[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    impactT1 = norm3(cross(impactN, up));
    impactT2 = cross(impactN, impactT1);
  }

  /* ----- render targets: 4× MSAA HDR scene -> resolve -> bloom chain -> composite ----- */
  let post = null;
  let lite = false;

  function makeTex(w, h) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, T_INT, w, h, 0, gl.RGBA, T_TYPE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function makeFbo(tex) {
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("fbo incomplete");
    return f;
  }
  function target(w, h) {
    const tex = makeTex(w, h);
    return { tex, fbo: makeFbo(tex), w, h };
  }

  function destroyPost() {
    if (!post) return;
    try {
      gl.deleteFramebuffer(post.msFbo);
      gl.deleteRenderbuffer(post.msRb);
      gl.deleteRenderbuffer(post.depthRb);
      [post.scene, ...post.levels, ...post.ana].forEach((t) => {
        gl.deleteFramebuffer(t.fbo);
        gl.deleteTexture(t.tex);
      });
    } catch (e) {}
    post = null;
  }

  function buildPost() {
    destroyPost();
    if (!MSAA) return;
    try {
      const msRb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, msRb);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, MSAA, T_INT, W, H);
      const depthRb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, MSAA, gl.DEPTH_COMPONENT24, W, H);
      const msFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msRb);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("msaa fbo incomplete");
      const scene = target(W, H);
      const levels = [];
      const n = lite ? 4 : 5;
      for (let i = 1; i <= n; i++) levels.push(target(Math.max(2, W >> i), Math.max(2, H >> i)));
      const ana = [target(Math.max(2, W >> 2), Math.max(2, H >> 2)), target(Math.max(2, W >> 2), Math.max(2, H >> 2))];
      post = { msFbo, msRb, depthRb, scene, levels, ana };
    } catch (err) {
      if (options.onError) options.onError(err);
      destroyPost();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function resize() {
    const cssW = canvas.clientWidth || window.innerWidth;
    const cssH = canvas.clientHeight || window.innerHeight;
    // cap the total pixel count so 4K screens stay smooth
    const MAXPX = 3.7e6;
    dpr = dprWanted;
    const px = cssW * cssH * dpr * dpr;
    if (px > MAXPX) dpr *= Math.sqrt(MAXPX / px);
    W = Math.max(2, Math.floor(cssW * dpr));
    H = Math.max(2, Math.floor(cssH * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    aspect = W / H;
    lite = dprWanted <= 1.0;
    layout();
    buildPost();
    gl.viewport(0, 0, W, H);
  }

  function setDpr(v) {
    dprWanted = clamp(v, 0.6, 2);
    resize();
  }

  /* ----- one-time Earth bake (MRT into two cubemaps) ----- */
  let earthA = null, earthB = null;
  function bakeEarth() {
    const S = hdr ? 1024 : 768;
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    const mk = (internal, type) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, t);
      for (let f = 0; f < 6; f++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, 0, internal, S, S, 0, gl.RGBA, type, null);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      return t;
    };
    earthA = mk(gl.RGBA8, gl.UNSIGNED_BYTE);
    earthB = mk(T_INT, T_TYPE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.viewport(0, 0, S, S);
    gl.useProgram(progs.bake);
    freshVao();
    for (let f = 0; f < 6; f++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, earthA, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, earthB, 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      if (f === 0 && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("earth bake fbo incomplete");
      gl.uniform1i(progs.bake.u("uFace"), f);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    [earthA, earthB].forEach((t) => {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, t);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (aniso) gl.texParameterf(gl.TEXTURE_CUBE_MAP, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    });
  }
  try {
    bakeEarth();
  } catch (err) {
    if (options.onError) options.onError(err);
    return null;
  }

  /* ----- gold A² emblem texture: crisp white glyph mask, shaded as metal in the fragment shader ----- */
  let glyphTex = null;
  function makeGlyphTexture() {
    try {
      const S = 1024;
      const cv = document.createElement("canvas");
      cv.width = cv.height = S;
      const g = cv.getContext("2d");
      if (!g) return null;
      // use the site's real display font (next/font exposes it through --font-display)
      let fam = "";
      try {
        fam = getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim();
      } catch (e) {}
      const stack = (fam ? fam + ", " : "") + 'Inter, "Helvetica Neue", Arial, sans-serif';
      const big = `700 720px ${stack}`, small = `700 400px ${stack}`;
      g.font = big;
      const wA = g.measureText("A").width;
      g.font = small;
      const w2 = g.measureText("2").width;
      const x0 = (S - (wA + w2 * 0.92)) / 2;
      g.fillStyle = "#fff";
      g.font = big;
      g.fillText("A", x0, S * 0.76);
      g.font = small;
      g.fillText("2", x0 + wA * 0.97, S * 0.45);
      const tex = glyphTex || gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    } catch (err) {
      return null;
    }
  }
  glyphTex = makeGlyphTexture();
  // if the display font is still loading, redraw the emblem once it is ready
  try {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (glyphTex) makeGlyphTexture();
      });
    }
  } catch (e) {}

  /* ----- attribute helpers ----- */
  function bindQuad(p) {
    const loc = gl.getAttribLocation(p, "aCorner");
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(loc, 0);
  }
  function bindInstanced(p, name, buf, size, stride, offset) {
    const loc = gl.getAttribLocation(p, name);
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(loc, 1);
  }
  function freshVao() {
    for (let i = 0; i < 8; i++) {
      gl.disableVertexAttribArray(i);
      gl.vertexAttribDivisor(i, 0);
    }
  }
  function drawMesh(p, mesh) {
    freshVao();
    const loc = gl.getAttribLocation(p, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vb);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ib);
    gl.drawElements(gl.TRIANGLES, mesh.n, gl.UNSIGNED_SHORT, 0);
  }
  function drawSprite(pos, sizeWorld, minPx, color, intensity, streak, crossAmt = 0) {
    const p = progs.sprite;
    gl.useProgram(p);
    freshVao();
    bindQuad(p);
    gl.uniformMatrix4fv(p.u("uVP"), false, vp);
    gl.uniform3fv(p.u("uPos"), pos);
    gl.uniform1f(p.u("uSize"), sizeWorld);
    gl.uniform1f(p.u("uMinPx"), minPx * dpr);
    gl.uniform1f(p.u("uProj"), projScale);
    gl.uniform2f(p.u("uRes"), W, H);
    gl.uniform3fv(p.u("uColor"), color);
    gl.uniform1f(p.u("uInt"), intensity);
    gl.uniform1f(p.u("uStreak"), streak);
    gl.uniform1f(p.u("uCross"), crossAmt);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  // sprite sized directly in device pixels (half-size)
  function drawSpritePx(pos, px, color, intensity, streak, crossAmt = 0) {
    drawSprite(pos, 0, px / dpr, color, intensity, streak, crossAmt);
  }

  const LAYERS = 16;
  function drawGlyph(pos, px, yaw, pitch, roll, intensity, heat, t) {
    const p = progs.glyph;
    gl.useProgram(p);
    freshVao();
    bindQuad(p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glyphTex);
    gl.uniform1i(p.u("uTex"), 0);
    gl.uniformMatrix4fv(p.u("uVP"), false, vp);
    gl.uniform3fv(p.u("uPos"), pos);
    gl.uniform2f(p.u("uRes"), W, H);
    gl.uniform1f(p.u("uPx"), px);
    gl.uniform1f(p.u("uYaw"), yaw);
    gl.uniform1f(p.u("uPitch"), pitch);
    gl.uniform1f(p.u("uRoll"), roll);
    gl.uniform1f(p.u("uLayers"), LAYERS);
    gl.uniform1f(p.u("uThick"), 0.16);
    gl.uniform1f(p.u("uInt"), intensity);
    gl.uniform1f(p.u("uHeat"), heat);
    gl.uniform1f(p.u("uTime"), t);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, LAYERS);
    gl.blendFunc(gl.ONE, gl.ONE);
  }

  /* ----- post chain ----- */
  function fsPass(p, fbo, w, h, texs, setup) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.useProgram(p);
    texs.forEach(([name, tex], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(p.u(name), i);
    });
    if (setup) setup(p);
    freshVao();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function runPost(t, fx) {
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    // resolve MSAA -> texture
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, post.msFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, post.scene.fbo);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);

    // bloom: bright-pass + dual-filter downsample chain
    let src = post.scene;
    post.levels.forEach((lv, i) => {
      fsPass(progs.down, lv.fbo, lv.w, lv.h, [["uTex", src.tex]], (p) => {
        gl.uniform2f(p.u("uTexel"), 1 / src.w, 1 / src.h);
        gl.uniform1f(p.u("uFirst"), i === 0 ? 1 : 0);
        gl.uniform1f(p.u("uThresh"), hdr ? 0.82 : 0.66);
        gl.uniform1f(p.u("uKnee"), 0.45);
      });
      src = lv;
    });

    // anamorphic horizontal streak from the 1/4-res level
    const useAna = !lite && fx.ana > 0.003;
    if (useAna) {
      const [a0, a1] = post.ana;
      const lv = post.levels[1];
      fsPass(progs.ana, a0.fbo, a0.w, a0.h, [["uTex", lv.tex]], (p) => {
        gl.uniform2f(p.u("uTexel"), 1 / lv.w, 1 / lv.h);
        gl.uniform1f(p.u("uStride"), 1.5);
        gl.uniform1f(p.u("uThresh"), hdr ? 0.55 : 0.4);
      });
      fsPass(progs.ana, a1.fbo, a1.w, a1.h, [["uTex", a0.tex]], (p) => {
        gl.uniform2f(p.u("uTexel"), 1 / a0.w, 1 / a0.h);
        gl.uniform1f(p.u("uStride"), 5);
        gl.uniform1f(p.u("uThresh"), 0);
      });
      fsPass(progs.ana, a0.fbo, a0.w, a0.h, [["uTex", a1.tex]], (p) => {
        gl.uniform2f(p.u("uTexel"), 1 / a1.w, 1 / a1.h);
        gl.uniform1f(p.u("uStride"), 14);
        gl.uniform1f(p.u("uThresh"), 0);
      });
    }

    // upsample + accumulate back to the biggest level
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = post.levels.length - 1; i >= 1; i--) {
      const from = post.levels[i], to = post.levels[i - 1];
      fsPass(progs.up, to.fbo, to.w, to.h, [["uTex", from.tex]], (p) => {
        gl.uniform2f(p.u("uTexel"), 1 / from.w, 1 / from.h);
        gl.uniform1f(p.u("uW"), 0.92);
      });
    }
    gl.disable(gl.BLEND);

    // composite to the screen
    fsPass(
      progs.comp,
      null,
      W,
      H,
      [
        ["uScene", post.scene.tex],
        ["uBloom", post.levels[0].tex],
        ["uAna", useAna ? post.ana[0].tex : post.levels[0].tex],
      ],
      (p) => {
        gl.uniform2f(p.u("uRes"), W, H);
        gl.uniform2f(p.u("uImp"), fx.imp[0], fx.imp[1]);
        gl.uniform2f(p.u("uRing"), fx.ringR, fx.ringA);
        gl.uniform1f(p.u("uTime"), t);
        gl.uniform1f(p.u("uBloomAmt"), fx.bloom);
        gl.uniform1f(p.u("uAnaAmt"), useAna ? fx.ana : 0);
        gl.uniform1f(p.u("uCA"), lite ? 0 : fx.ca);
        gl.uniform1f(p.u("uZoom"), lite ? 0 : fx.zoom);
        gl.uniform1f(p.u("uVig"), 0.32);
        gl.uniform1f(p.u("uGrain"), 0.012);
      }
    );
  }

  const SUN_DIR = norm3([-0.78, 0.62, -0.1]);
  const info = { vis: 0, x: 0, y: 0, r: 0, range: 0 };
  const D0 = 450; // how far away A² starts — deep space, far beyond the stars
const FINAL_TARGET = [0, -0.15, 0];

  function render(t) {
    const tf = t - TL.flight;
    const u = clamp(tf / (TL.impact - TL.flight));
    const tI = t - TL.impact;
    const exposure = 1 - 0.38 * smooth(TL.reveal, TL.reveal + 1.3, t);

    // ---- A² state: thrown from ~450 units away. Distance shrinks exponentially, so the apparent size
    //      grows at a steady rate: a faint glint for a long time, then a rush as it nears the Earth.
    const eye0 = arr.eye;
    const D1 = Math.hypot(impactP[0] - eye0[0], impactP[1] - eye0[1], impactP[2] - eye0[2]);
    const dirImp = norm3([impactP[0] - eye0[0], impactP[1] - eye0[1], impactP[2] - eye0[2]]);
    const thH = Math.tan((35 * Math.PI) / 360); // the arrival lens
    // the speck starts in the far sky up-left of the strike point; pick the lowest start that keeps the straight path clear of the planet
    let start = impactP;
    for (let off = 0.1; off < 0.62; off += 0.04) { // capped so the speck is in frame from the start
      const sx = -0.34 * thH * aspect, sy = off * thH;
      const d = norm3([dirImp[0] + arr.r[0] * sx + arr.u[0] * sy, dirImp[1] + arr.r[1] * sx + arr.u[1] * sy, dirImp[2] + arr.r[2] * sx + arr.u[2] * sy]);
      start = [eye0[0] + d[0] * D0, eye0[1] + d[1] * D0, eye0[2] + d[2] * D0];
      const v = norm3([start[0] - impactP[0], start[1] - impactP[1], start[2] - impactP[2]]);
      if (v[0] * impactN[0] + v[1] * impactN[1] + v[2] * impactN[2] > 0.02) break;
    }
    const ue = Math.pow(u, 1.9); // lingers far away, then the last stretch is a sudden rush
    const distT = D0 * Math.pow(D1 / D0, ue);
    const sPath = clamp((D0 - distT) / (D0 - D1));
    const mp = mix3(start, impactP, sPath);
    const vel = norm3([impactP[0] - start[0], impactP[1] - start[1], impactP[2] - start[2]]);
    const heat = smooth(0.8, 1.0, u);
    const flying = t >= TL.flight && t < TL.impact;
    const appear = smooth(0, 0.18, u);

    // ---- camera director
    //   part 1: a long lens at first (compressed, distant), widening as the camera chases A² down to the Earth
    //   part 2: it lets go, shakes, FOV-kicks and pushes in so the explosion and the Earth fill the screen
    //   part 3: it eases back so the title sits above the glowing planet
    const kick = tI > 0 ? 8 * (1 - Math.exp(-tI * 40)) * Math.exp(-tI * 3.0) : 0;
    const fovDeg = t < TL.impact ? 34 + 1.5 * u : 36 + 9 * smooth(TL.impact, TL.impact + 0.5, t) + kick;
    fov = (fovDeg * Math.PI) / 180;
    projScale = (1 / Math.tan(fov / 2)) * Math.min(H, W * 1.35) * 0.5;

    const shake = tI > 0 ? 0.28 * Math.exp(-tI * 2.6) : 0;
    const push = 0.55 * smooth(TL.impact, TL.impact + 1.6, t) - 0.35 * smooth(TL.reveal, TL.reveal + 2.0, t);
    const eye = [
      Math.sin(t * 0.31) * 0.22 + Math.sin(t * 61) * shake,
      0.15 + Math.cos(t * 0.23) * 0.06 + Math.cos(t * 73) * shake,
      7.4 + (arr.eye[2] - 7.4) * (1 - smooth(TL.impact, TL.reveal - 0.2, t)) - 0.2 * Math.min(t, TL.impact) - push,
    ];
    let target = mix3(arr.target, FINAL_TARGET, smooth(TL.impact + 0.2, TL.reveal - 0.4, t));
    if (tI > 0) {
      const focus = 0.55 * smooth(TL.impact, TL.impact + 1.2, t) * (1 - smooth(TL.reveal - 0.6, TL.reveal + 0.8, t));
      target = mix3(target, impactP, focus);
    }
    perspective(proj, fov, aspect, 0.1, 2000);
    lookAt(view, eye, target, [0, 1, 0]);
    mul(vp, proj, view);
    const dx = target[0] - eye[0], dy = target[1] - eye[1], dz = target[2] - eye[2];
    const panYaw = Math.atan2(dx, -dz), panPitch = Math.asin(dy / (Math.hypot(dx, dy, dz) || 1));

    // impact point on screen (for flash, ring, ripple and zoom blur)
    const cc = [
      vp[0] * impactP[0] + vp[4] * impactP[1] + vp[8] * impactP[2] + vp[12],
      vp[1] * impactP[0] + vp[5] * impactP[1] + vp[9] * impactP[2] + vp[13],
      vp[3] * impactP[0] + vp[7] * impactP[1] + vp[11] * impactP[2] + vp[15],
    ];
    const impUv = [(cc[0] / cc[2]) * 0.5 + 0.5, (cc[1] / cc[2]) * 0.5 + 0.5];

    gl.bindFramebuffer(gl.FRAMEBUFFER, post ? post.msFbo : null);
    gl.viewport(0, 0, W, H);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    // 1. nebula backdrop (slides with the camera pan)
    gl.useProgram(progs.bg);
    freshVao();
    gl.uniform1f(progs.bg.u("uTime"), t);
    gl.uniform1f(progs.bg.u("uExposure"), exposure);
    gl.uniform2f(progs.bg.u("uRes"), W, H);
    gl.uniform2f(progs.bg.u("uOff"), panYaw * 2.8, panPitch * 2.8);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. stars (additive)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    {
      const p = progs.star;
      gl.useProgram(p);
      freshVao();
      bindQuad(p);
      bindInstanced(p, "aPos", starBuf, 3, 24, 0);
      bindInstanced(p, "aMisc", starBuf, 3, 24, 12);
      gl.uniformMatrix4fv(p.u("uVP"), false, vp);
      gl.uniform2f(p.u("uRes"), W, H);
      gl.uniform1f(p.u("uTime"), t);
      gl.uniform1f(p.u("uDpr"), dpr);
      gl.uniform1f(p.u("uExposure"), exposure);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, STARS);
    }
    gl.disable(gl.BLEND);

    const shockT = Math.max(0, tI);
    const shock = shockT * 0.62;
    const shockA = tI > 0 ? Math.max(0, 1 - shockT / 3.2) : 0;
    const crater = tI > 0 ? 0.25 + 0.75 * Math.exp(-shockT * 1.4) : 0;
    const mLight = flying ? heat * heat * 2.4 : 0; // A² lights the planet gold as it falls

    // 3. Earth
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    {
      const p = progs.earth;
      gl.useProgram(p);
      gl.uniformMatrix4fv(p.u("uVP"), false, vp);
      gl.uniform3fv(p.u("uCenter"), earthC);
      gl.uniform1f(p.u("uR"), earthR);
      gl.uniform3fv(p.u("uCam"), eye);
      gl.uniform3fv(p.u("uLight"), LIGHT);
      gl.uniform3fv(p.u("uImpactN"), impactN);
      gl.uniform3fv(p.u("uMPos"), flying ? mp : [0, 1e4, 0]);
      gl.uniform2f(
        p.u("uLs"),
        LIGHT[0] * view[0] + LIGHT[1] * view[4] + LIGHT[2] * view[8],
        LIGHT[0] * view[1] + LIGHT[1] * view[5] + LIGHT[2] * view[9]
      );
      gl.uniform1f(p.u("uBumpK"), H * 0.12);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, earthA);
      gl.uniform1i(p.u("uA"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, earthB);
      gl.uniform1i(p.u("uB"), 1);
      gl.uniform1f(p.u("uTime"), t);
      gl.uniform1f(p.u("uShock"), shock);
      gl.uniform1f(p.u("uShockA"), shockA);
      gl.uniform1f(p.u("uCrater"), crater);
      gl.uniform1f(p.u("uMLight"), mLight);
      gl.uniform1f(p.u("uExposure"), exposure);
      drawMesh(p, earthMesh);
    }

    // 4. atmosphere shell (additive, back faces)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(false);
    gl.cullFace(gl.FRONT);
    {
      const ratio = 1.085;
      const p = progs.atmo;
      gl.useProgram(p);
      gl.uniformMatrix4fv(p.u("uVP"), false, vp);
      gl.uniform3fv(p.u("uCenter"), earthC);
      gl.uniform1f(p.u("uR"), earthR * ratio);
      gl.uniform3fv(p.u("uCam"), eye);
      gl.uniform3fv(p.u("uLight"), LIGHT);
      gl.uniform1f(p.u("uLimb"), Math.sqrt(1 - 1 / (ratio * ratio)));
      gl.uniform1f(p.u("uAtmo"), 1.05 * (1 + (tI > 0 ? 0.7 * Math.exp(-tI * 1.2) : 0) + heat * 0.1));
      gl.uniform1f(p.u("uExposure"), exposure);
      drawMesh(p, earthMesh);
    }
    gl.disable(gl.CULL_FACE);

    // 5. A²: fiery tail, glint, halo, then the extruded emblem itself
    let anaFlight = 0;
    info.vis = 0;
    info.range = 0;
    if (flying) {
      const dist = Math.hypot(mp[0] - eye[0], mp[1] - eye[1], mp[2] - eye[2]);
      gl.disable(gl.DEPTH_TEST);
      // a single point of light: a faint cold speck for most of the flight, flaring only in the last instants
      const near = smooth(0.82, 1.0, u);
      const tw = 0.88 + 0.12 * Math.sin(t * 9.0);
      const px = Math.max(5.6 * dpr, (0.2 * projScale * dpr) / Math.max(dist, 1));
      const inten = (1.3 + 0.6 * u + 1.8 * near * near) * appear * tw;
      drawSpritePx(mp, px, [0.9, 0.95, 1.0], inten, 0.0, 0.0);
      if (near > 0.01) drawSpritePx(mp, px * 3.2, [0.85, 0.92, 1.0], 0.22 * near * near, 0.0, 0.0);
      gl.enable(gl.DEPTH_TEST);
      info.vis = 0;
    }

    // 6. sunrise over the limb during the title, then sparkle dust
    const sunI = smooth(TL.reveal - 0.6, TL.reveal + 2.4, t) * (1 - smooth(TL.exit - 0.3, TL.exit + 0.6, t));
    gl.disable(gl.DEPTH_TEST);
    if (false) {
      const sp = [earthC[0] + SUN_DIR[0] * earthR * 1.012, earthC[1] + SUN_DIR[1] * earthR * 1.012, earthC[2] + SUN_DIR[2] * earthR * 1.012];
      drawSpritePx(sp, 140 * dpr * (0.8 + 0.4 * sunI), [1, 0.84, 0.58], 0.85 * sunI, 1.0, 0.5);
    }
    {
      const p = progs.mote;
      gl.useProgram(p);
      freshVao();
      bindQuad(p);
      bindInstanced(p, "aM", moteBuf, 4, 16, 0);
      gl.uniformMatrix4fv(p.u("uVP"), false, vp);
      gl.uniform2f(p.u("uRes"), W, H);
      gl.uniform1f(p.u("uTime"), t);
      gl.uniform1f(p.u("uProj"), projScale);
      gl.uniform1f(p.u("uDpr"), dpr);
      gl.uniform1f(p.u("uAmt"), (0.30 + 0.40 * smooth(TL.reveal - 0.5, TL.reveal + 1.5, t)) * smooth(0, 1.4, t));
      if (false) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, MOTE_N);
    }
    gl.enable(gl.DEPTH_TEST);

    // 7. explosion: sparks, fireball and bloom
    if (tI > 0) {
      const p = progs.debris;
      gl.useProgram(p);
      freshVao();
      bindQuad(p);
      bindInstanced(p, "aRand", debBuf, 4, 16, 0);
      gl.uniformMatrix4fv(p.u("uVP"), false, vp);
      gl.uniform2f(p.u("uRes"), W, H);
      gl.uniform1f(p.u("uDpr"), dpr);
      gl.uniform1f(p.u("uBurst"), tI);
      gl.uniform3fv(p.u("uImpP"), impactP);
      gl.uniform3fv(p.u("uImpN"), impactN);
      gl.uniform3fv(p.u("uT1"), impactT1);
      gl.uniform3fv(p.u("uT2"), impactT2);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, DEB_N);

      gl.disable(gl.DEPTH_TEST);
      const grow = 1 - Math.exp(-tI * 1.8);
      const fb = Math.exp(-tI * 1.5);
      if (fb > 0.01) drawSprite(impactP, 1.8 + 3.2 * grow, 40, [1, .66, .40], 0.20 * fb * fb, 0.0);
      const core = Math.exp(-tI * 3.0);
      if (core > 0.01) drawSprite(impactP, 1.0 + 1.8 * grow, 30, [1, .94, .86], 0.55 * core, 0.0);
      gl.enable(gl.DEPTH_TEST);
    }

    // 8. white-gold flash + expanding blast ring (additive, in the HDR buffer)
    gl.disable(gl.DEPTH_TEST);
    const preflash = u >= 1 || t >= TL.impact ? 0 : smooth(0.97, 1, u) * 0.3;
    const flash = tI >= 0 ? 1.5 * Math.exp(-tI * 7.5) : preflash * 0.6;
    const ringR = tI > 0 ? tI * 0.5 : 0;
    const ringA = tI > 0 ? 0.85 * (1 - smooth(0, 2.4, tI)) : 0;
    if (flash > 0.004 || ringA > 0.004) {
      gl.useProgram(progs.flash);
      freshVao();
      gl.uniform1f(progs.flash.u("uFlash"), Math.max(flash, 0));
      gl.uniform2f(progs.flash.u("uRing"), ringR, ringA);
      gl.uniform2f(progs.flash.u("uC"), impUv[0], impUv[1]);
      gl.uniform2f(progs.flash.u("uRes"), W, H);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);
    gl.depthMask(true);

    // 9. post: resolve MSAA, bloom, anamorphic streaks, ripple, grade, grain
    if (post) {
      const ex = tI > 0 ? Math.exp(-tI * 3) : 0;
      runPost(t, {
        imp: impUv,
        ringR,
        ringA: tI > 0 ? ringA : 0,
        bloom: 0.16 + 0.04 * heat + (tI > 0 ? 0.42 * Math.exp(-tI * 3.2) : 0),
        ana: 0,
        ca: 0.0003 + 0.0028 * ex,
        zoom: tI > 0 ? 0.04 * Math.exp(-tI * 7) : 0,
      });
    }
  }

  resize();

  return {
    render,
    resize,
    setDpr,
    get hdr() {
      return hdr;
    },
    get dpr() {
      return dprWanted;
    },
    info,
    destroy() {
      try {
        destroyPost();
        [quad, starBuf, tailBuf, debBuf, moteBuf, earthMesh.vb, earthMesh.ib].forEach((b) => gl.deleteBuffer(b));
        if (glyphTex) gl.deleteTexture(glyphTex);
        if (earthA) gl.deleteTexture(earthA);
        if (earthB) gl.deleteTexture(earthB);
        Object.values(progs).forEach((p) => gl.deleteProgram(p));
        const ext = gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
      } catch (e) {}
    },
  };
}
