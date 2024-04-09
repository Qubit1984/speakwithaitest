import { StreamableValue, readStreamableValue } from "ai/rsc";
import { useEffect, useState, useRef } from "react";

export const useStreamableText = (
  content: string | StreamableValue<string>,
  // onComplete?: () => void, //my code
) => {
  const [rawContent, setRawContent] = useState(
    typeof content === "string" ? content : "",
  );
  const isComplete = useRef(false); //my code
  useEffect(() => {
    (async () => {
      if (typeof content === "object") {
        let value = "";
        for await (const delta of readStreamableValue(content)) {
          console.log(delta);
          if (typeof delta === "string") {
            setRawContent((value = value + delta));
          }
        }
        isComplete.current = true;
        // onComplete?.(); //my code
      } else {
        //  isComplete.current = true;
      }
    })();
  }, [content]);

  return [rawContent as string, isComplete.current as boolean];
};
