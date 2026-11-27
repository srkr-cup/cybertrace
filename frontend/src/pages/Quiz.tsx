import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import BackToCommunity from "../components/BackToCommunity";

type Language = "en" | "te";
type QuizQuestion = {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
};
type QuizResult = {
  score: number;
  total: number;
  answers: {
    id: string;
    prompt: string;
    selected_option: string;
    correct_option: string;
    is_correct: boolean;
    explanation: string;
  }[];
};

const COPY = {
  en: {
    eyebrow: "Community cyber safety",
    title: "Cyber Awareness Quiz",
    intro: "Answer ten practical questions about safer online habits. Your answers are scored by the server; explanations appear after you submit.",
    language: "Language",
    progress: "answered",
    submit: "Check my answers",
    submitting: "Checking…",
    incomplete: "Answer every question before submitting.",
    score: "Your score",
    correct: "Correct",
    incorrect: "Review this answer",
    retry: "Try again",
    loading: "Loading questions…",
    error: "The quiz could not be loaded. Check your connection and try again.",
    back: "Knowledge Centre",
    limited: "This quiz is for learning only. It does not assess a real message or incident.",
  },
  te: {
    eyebrow: "సమాజ సైబర్ భద్రత",
    title: "సైబర్ అవగాహన క్విజ్",
    intro: "ఆన్‌లైన్ భద్రతపై పది ప్రశ్నలకు సమాధానం ఇవ్వండి. సమర్పించిన తర్వాత సర్వర్ మీ సమాధానాలను పరిశీలించి వివరణలు చూపిస్తుంది.",
    language: "భాష",
    progress: "సమాధానాలు",
    submit: "నా సమాధానాలు చూడండి",
    submitting: "పరిశీలిస్తోంది…",
    incomplete: "సమర్పించే ముందు అన్ని ప్రశ్నలకు సమాధానం ఇవ్వండి.",
    score: "మీ స్కోరు",
    correct: "సరైన సమాధానం",
    incorrect: "ఈ సమాధానాన్ని చూడండి",
    retry: "మళ్లీ ప్రయత్నించండి",
    loading: "ప్రశ్నలు లోడ్ అవుతున్నాయి…",
    error: "క్విజ్ తెరవలేకపోయాం. కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.",
    back: "సైబర్ నేరాల సమాచార కేంద్రం",
    limited: "ఈ క్విజ్ నేర్చుకోవడం కోసం మాత్రమే. ఇది నిజమైన సందేశం లేదా ఘటనను విశ్లేషించదు.",
  },
} satisfies Record<Language, Record<string, string>>;

export default function Quiz() {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("ct_knowledge_language") === "te" ? "te" : "en",
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState(false);
  const text = COPY[language];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  useEffect(() => {
    localStorage.setItem("ct_knowledge_language", language);
    setLoading(true);
    setError(false);
    setAnswers({});
    setResult(null);
    api.getQuiz(language)
      .then((response) => setQuestions(response.questions))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [language]);

  const submit = async () => {
    if (answeredCount !== questions.length) {
      setNotice(true);
      return;
    }
    setSubmitting(true);
    setNotice(false);
    try {
      setResult(await api.scoreQuiz(language, answers));
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setAnswers({});
    setResult(null);
    setNotice(false);
    setError(false);
  };

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 border-b border-slate-200 pb-5">
        <BackToCommunity language={language} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-700">{text.eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{text.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{text.intro}</p>
            <Link to="/knowledge" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">← {text.back}</Link>
          </div>
          <fieldset className="shrink-0">
            <legend className="mb-1 text-xs font-medium text-slate-600">{text.language}</legend>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label={text.language}>
              <button type="button" onClick={() => setLanguage("en")} aria-pressed={language === "en"} className={`rounded-md px-3 py-1.5 text-sm ${language === "en" ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>English</button>
              <button type="button" onClick={() => setLanguage("te")} aria-pressed={language === "te"} className={`rounded-md px-3 py-1.5 text-sm ${language === "te" ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}>తెలుగు</button>
            </div>
          </fieldset>
        </div>
      </header>

      {loading && <p className="py-8 text-sm text-slate-500" role="status">{text.loading}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{text.error}</p>}
      {!loading && !error && (
        <>
          <div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-600">
            <span>{answeredCount} / {questions.length} {text.progress}</span>
            <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div className="h-full bg-brand-600 transition-all" style={{ width: `${questions.length ? answeredCount / questions.length * 100 : 0}%` }} />
            </div>
          </div>

          {result && (
            <section className="mb-5 rounded-lg border border-brand-200 bg-brand-50 p-5" aria-live="polite">
              <p className="text-xs font-semibold uppercase text-brand-800">{text.score}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{result.score} / {result.total}</p>
            </section>
          )}

          <div className="space-y-3">
            {questions.map((question, index) => {
              const reviewed = result?.answers.find((item) => item.id === question.id);
              return (
                <fieldset key={question.id} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                  <legend className="px-1 text-sm font-semibold leading-6 text-slate-900">{index + 1}. {question.prompt}</legend>
                  <div className="mt-2 space-y-2">
                    {question.options.map((option) => {
                      const checked = answers[question.id] === option.id;
                      const isCorrect = reviewed?.correct_option === option.id;
                      const wasSelected = reviewed?.selected_option === option.id;
                      return (
                        <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm leading-6 ${
                          result && isCorrect ? "border-emerald-300 bg-emerald-50" :
                            result && wasSelected && !reviewed.is_correct ? "border-red-300 bg-red-50" :
                              checked ? "border-brand-300 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
                        }`}>
                          <input type="radio" name={question.id} value={option.id} checked={checked} disabled={Boolean(result)} onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: option.id }))} className="mt-1 accent-brand-700" />
                          <span>{option.text}</span>
                          {result && isCorrect && <span className="ml-auto shrink-0 text-xs font-semibold text-emerald-800">{text.correct}</span>}
                          {result && wasSelected && !reviewed.is_correct && <span className="ml-auto shrink-0 text-xs font-semibold text-red-800">{text.incorrect}</span>}
                        </label>
                      );
                    })}
                  </div>
                  {reviewed && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">{reviewed.explanation}</p>}
                </fieldset>
              );
            })}
          </div>

          {notice && !result && <p className="mt-3 text-sm text-amber-800" role="status">{text.incomplete}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            {result ? (
              <button type="button" onClick={retry} className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800">{text.retry}</button>
            ) : (
              <button type="button" onClick={submit} disabled={submitting || loading} className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{submitting ? text.submitting : text.submit}</button>
            )}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">{text.limited}</p>
        </>
      )}
    </main>
  );
}
