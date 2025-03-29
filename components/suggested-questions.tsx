import { Message } from 'ai';

interface SuggestedQuestionsProps {
  setInput: (input: string) => void;
  handleSubmit: (event?: { preventDefault?: () => void }) => void;
}

const questions = [
  "How can I start saving/investing with a limited income in Pakistan",
  "What are the best investment options in Pakistan for beginners?",
  "How much money do I need to retire early in Pakistan?",
  "Is it better to invest in real estate, stocks, or mutual funds in Pakistan?",
  "How can I minimize taxes on my investments in Pakistan?"
];

export function SuggestedQuestions({ setInput, handleSubmit }: SuggestedQuestionsProps) {
  const handleQuestionClick = (question: string) => {
    setInput(question);
    handleSubmit();
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <h2 className="text-lg font-semibold mb-2">Suggested Questions</h2>
      <div className="flex flex-col gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            className="text-left px-4 py-2 rounded-lg hover:bg-muted transition-colors duration-200"
            onClick={() => handleQuestionClick(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
} 