import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';

interface RedditLinkProps {
  href: string;
  index: number;
  children: React.ReactNode;
}

export const RedditLink = ({ href, index, children }: RedditLinkProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const linkRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(true);

    // Calculate position for the hover card
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10,
        left: rect.left
      });
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <span
        ref={linkRef}
        className="inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium text-gray-600 border border-gray-200"
        >
          {index}
        </Link>
      </span>
      {isHovered && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-50"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateY(-100%)'
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 w-[320px]">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
              {children}
            </div>
            <Link
              href={href}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 truncate font-mono transition-colors"
            >
              {href}
            </Link>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}; 