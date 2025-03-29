import { Message } from 'ai';

interface SuggestedQuestionsProps {
  setInput: (input: string) => void;
  handleSubmit: (event?: { preventDefault?: () => void }) => void;
  input: string;
}

const questions = [
  "How can I start saving/investing with a limited income in Pakistan",
  "What are the best investment options in Pakistan for beginners?",
  "How much money do I need to retire early in Pakistan?",
  "Is it better to invest in real estate, stocks, or mutual funds in Pakistan?",
  "How can I minimize taxes on my investments in Pakistan?"
];

export function SuggestedQuestions({ setInput, handleSubmit, input }: SuggestedQuestionsProps) {
  const handleQuestionClick = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4">
      <div className="w-full max-w-lg space-y-4">
        <h2 className="text-xl font-semibold text-center mb-6">Suggested Questions</h2>
        <div className="flex flex-col gap-3">
          {questions.map((question, index) => (
            <button
              key={index}
              className={`w-full text-left px-6 py-3 rounded-xl transition-colors duration-200 text-sm border ${input === question
                  ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800'
                }`}
              onClick={() => handleQuestionClick(question)}
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 