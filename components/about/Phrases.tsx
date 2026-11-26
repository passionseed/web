/**
 * Thai has no spaces between words, so phones break headings mid-word
 * ("ตัว / เอง"). Keep each phrase whole: break only at a space, or at a
 * "|" that marks a safe break inside a phrase.
 */
export function Phrases({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((phrase, i) => (
        <span key={i}>
          {i > 0 && " "}
          {phrase.split("|").map((part, j) => (
            <span key={j}>
              {j > 0 && <wbr />}
              <span className="whitespace-nowrap">{part}</span>
            </span>
          ))}
        </span>
      ))}
    </>
  );
}
