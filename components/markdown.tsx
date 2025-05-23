import Link from 'next/link';
import { memo, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
import { RedditLink } from './RedditLink';

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  // Pre-process the content to find Reddit links and assign indices
  const { redditLinkIndices, components } = useMemo(() => {
    const redditLinkIndices = new Map<string, number>();
    let currentIndex = 0;

    // Find all Reddit links in the content
    const redditLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]*reddit\.com[^)]+)\)/g;
    const matches = Array.from(children.matchAll(redditLinkRegex));
    matches.forEach(match => {
      const url = match[2];
      currentIndex++;
      redditLinkIndices.set(url, currentIndex);
    });

    const markdownComponents: Components = {
      code: ({ node, className, children, ...props }) => {
        return (
          <CodeBlock {...props} inline={false}>
            {children}
          </CodeBlock>
        );
      },
      pre: ({ children }) => <>{children}</>,
      ol: ({ node, children, ...props }) => {
        return (
          <ol className="list-decimal list-outside ml-4" {...props}>
            {children}
          </ol>
        );
      },
      li: ({ node, children, ...props }) => {
        return (
          <li className="py-1" {...props}>
            {children}
          </li>
        );
      },
      ul: ({ node, children, ...props }) => {
        return (
          <ul className="list-decimal list-outside ml-4" {...props}>
            {children}
          </ul>
        );
      },
      strong: ({ node, children, ...props }) => {
        return (
          <span className="font-semibold" {...props}>
            {children}
          </span>
        );
      },
      a: ({ node, children, href, ...props }) => {
        if (href?.includes('reddit.com')) {
          const index = redditLinkIndices.get(href) || 0;
          return (
            <RedditLink href={href} index={index}>
              {children}
            </RedditLink>
          );
        }

        return (
          <Link
            className="text-blue-500 hover:underline"
            target="_blank"
            rel="noreferrer"
            href={href ?? '#'}
            {...props}
          >
            {children}
          </Link>
        );
      },
      h1: ({ node, children, ...props }) => {
        return (
          <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
            {children}
          </h1>
        );
      },
      h2: ({ node, children, ...props }) => {
        return (
          <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
            {children}
          </h2>
        );
      },
      h3: ({ node, children, ...props }) => {
        return (
          <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
            {children}
          </h3>
        );
      },
      h4: ({ node, children, ...props }) => {
        return (
          <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
            {children}
          </h4>
        );
      },
      h5: ({ node, children, ...props }) => {
        return (
          <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
            {children}
          </h5>
        );
      },
      h6: ({ node, children, ...props }) => {
        return (
          <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
            {children}
          </h6>
        );
      },
    };

    return { redditLinkIndices, components: markdownComponents };
  }, [children]);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
