'use client';

const EXAMPLE_COMMANDS = [
  '/signals',
  '/models',
  '/company openai',
  '/events funding',
] as const;

/**
 * CommandBar — bottom terminal input for search and commands.
 *
 * Example commands:
 *   /signals          — browse latest signals
 *   /models           — view model releases
 *   /company openai   — company intelligence
 *   /events funding   — funding events
 */
export function CommandBar() {
  return (
    <div className="il-cmd" role="search">
      <div className="il-cmd-input">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          className="il-cmd-field"
          placeholder="Search intelligence or run command..."
          aria-label="Search intelligence or run command"
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      <div className="il-cmd-hints" aria-label="Example commands">
        {EXAMPLE_COMMANDS.map((cmd) => (
          <span key={cmd} className="il-cmd-hint" role="button" tabIndex={0}>
            {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}
