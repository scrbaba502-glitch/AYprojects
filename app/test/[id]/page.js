import { notFound } from "next/navigation";
import { tests, getTest, getQuestionsFor } from "../../../lib/questions";
import TestRunner from "../../../components/TestRunner";

export function generateStaticParams() {
  return tests.map((t) => ({ id: t.id }));
}

export default function TestPage({ params }) {
  const test = getTest(params.id);
  if (!test) notFound();
  const questions = getQuestionsFor(test);
  return <TestRunner test={test} questions={questions} />;
}
