"use client";

import {
  CreateProjectKeyResponse,
  LiveClient,
  LiveTranscriptionEvents,
  createClient,
} from "@deepgram/sdk";
import { useState, useEffect, useCallback, useRef } from "react";
import { useQueue } from "@uidotdev/usehooks";
import { IconMicrophone } from "../ui/icons";
import { Button } from "@/components/ui/button";

interface MicrophoneProps {
  onVoiceChange: (voice: string) => void;
}
export default function Microphone({ onVoiceChange }: MicrophoneProps) {
  const { add, remove, first, size, queue } = useQueue<any>([]);
  const [apiKey, setApiKey] = useState<CreateProjectKeyResponse | null>();
  const [connection, setConnection] = useState<LiveClient | null>();
  const [isListening, setListening] = useState(false);
  const [isLoadingKey, setLoadingKey] = useState(true);
  const [isLoading, setLoading] = useState(true);
  const [isProcessing, setProcessing] = useState(false);
  const [micOpen, setMicOpen] = useState(false);
  const [microphone, setMicrophone] = useState<MediaRecorder | null>();
  const [userMedia, setUserMedia] = useState<MediaStream | null>();
  //const [caption, setCaption] = useState<string | null>();

  const textRef = useRef<string[]>([]);

  const toggleMicrophone = useCallback(async () => {
    if (connection) {
      connection.finish();

      if (microphone) {
        microphone.stop();
      }
    } else {
      const userMedia = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!microphone) {
        const microphone = new MediaRecorder(userMedia);
        microphone.start(500);

        microphone.onstart = () => {
          setMicOpen(true);
        };

        microphone.onstop = () => {
          setMicOpen(false);
          setMicrophone(null);
          console.log("microphone stopped");
        };

        microphone.ondataavailable = (e) => {
          add(e.data);
        };

        setUserMedia(userMedia);
        setMicrophone(microphone);
      }
      if (apiKey && "key" in apiKey) {
        console.log("connecting on");
        const deepgram = createClient(apiKey?.key ?? "");
        const connection = deepgram.listen.live({
          model: "nova-2",
          //language: "ja",
          utterance_end_ms: 1000,
          interim_results: true,
          smart_format: true,
        });
        let keepAlive;
        if (keepAlive) clearInterval(keepAlive);
        keepAlive = setInterval(() => {
          console.log("KeepAlive sent.");
          connection.keepAlive();
        }, 4000); // Sending KeepAlive messages every 3 seconds

        connection.on(LiveTranscriptionEvents.Open, () => {
          console.log("connection established");
          setListening(true);
        });

        connection.on(LiveTranscriptionEvents.Close, () => {
          console.log("connection closed");
          setListening(false);
          setApiKey(null);
          setConnection(null);
          setMicrophone(null);
          clearInterval(keepAlive);
        });

        connection.on(LiveTranscriptionEvents.Transcript, (data) => {
          const text = data.channel.alternatives[0].transcript;
          const final = data.is_final;
          if (final && text) {
            textRef.current.push(text);
          }
          /*     const words = data.channel.alternatives[0].words;
          const caption = words
            .map((word: any) => word.punctuated_word ?? word.word)
            .join(" ");
          if (caption !== "") {
            setCaption(caption);
          } */
        });
        connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
          const sentence = textRef.current.join(" ");
          onVoiceChange(sentence);
          textRef.current = [];
        });
        setConnection(connection);
        setLoading(false);
      }
    }
  }, [add, microphone, userMedia, apiKey]);

  useEffect(() => {
    if (!apiKey) {
      console.log("getting a new api key");
      fetch("/api", { cache: "no-store" })
        .then((res) => res.json())
        .then((object) => {
          if (!("key" in object)) throw new Error("No api key returned");

          setApiKey(object);
          setLoadingKey(false);
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }, [apiKey, connection]);
  /* 
  useEffect(() => {
    if (apiKey && "key" in apiKey) {
      console.log("connecting to deepgram");
      const deepgram = createClient(apiKey?.key ?? "");
      const connection = deepgram.listen.live({
        model: "nova-2",
        //language: "ja",
        utterance_end_ms: 1500,
        interim_results: true,
        smart_format: true,
      });
      let keepAlive;
      if (keepAlive) clearInterval(keepAlive);
      keepAlive = setInterval(() => {
        console.log("KeepAlive sent.");
        connection.keepAlive();
      }, 3000); // Sending KeepAlive messages every 3 seconds

      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log("connection established");
        setListening(true);
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log("connection closed");
        setListening(false);
        setApiKey(null);
        setConnection(null);
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const text = data.channel.alternatives[0].transcript;
        const final = data.is_final;
        if (final && text) {
          textRef.current.push(text);
        }

        const words = data.channel.alternatives[0].words;
        const caption = words
          .map((word: any) => word.punctuated_word ?? word.word)
          .join(" ");
        if (caption !== "") {
          setCaption(caption);
        }
      });
      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        const sentence = textRef.current.join(" ");
        onVoiceChange(sentence);
        textRef.current = [];
      });
      setConnection(connection);
      setLoading(false);
    }
  }, [apiKey]);
 */
  useEffect(() => {
    const processQueue = async () => {
      if (size > 0 && !isProcessing) {
        setProcessing(true);

        if (isListening && connection) {
          const blob = first;
          connection?.send(blob);
          remove();
        }

        const waiting = setTimeout(() => {
          clearTimeout(waiting);
          setProcessing(false);
        }, 250);
      }
    };

    processQueue();
  }, [connection, queue, remove, first, size, isProcessing, isListening]);

  /*  if (isLoadingKey)
    return (
      <span className="w-full text-center">Loading temporary API key...</span>
    );
  if (isLoading)
    return <span className="w-full text-center">Loading the app...</span>; */

  return (
    <Button className="" size="icon" onClick={() => toggleMicrophone()}>
      <IconMicrophone
        // width="96"
        // height="96"
        className={
          `cursor-pointer` + !!userMedia &&
          !!microphone &&
          micOpen &&
          connection
            ? "fill-red-400 drop-shadow-glowRed"
            : "fill-gray-600"
        }
      />
      <span className="sr-only">Send message</span>
    </Button>

    /*    <button className="w-10 h-10" onClick={() => toggleMicrophone()}>
      <Recording
        width="96"
        height="96"
        className={
          `cursor-pointer` + !!userMedia && !!microphone && micOpen
            ? "fill-red-400 drop-shadow-glowRed"
            : "fill-gray-600"
        }
      />
    </button> */
    /*  <div className="w-full relative">
      <div className="mt-10 flex flex-col align-middle items-center">
          {!!userMedia && !!microphone && micOpen ? (
          <Image
            src="/speak.png"
            width="168"
            height="129"
            alt="Deepgram Logo"
            priority
          />
        ) : (
          <Image
            src="/click.png"
            width="168"
            height="129"
            alt="Deepgram Logo"
            priority
          />
        )} 

        <button className="w-24 h-24" onClick={() => toggleMicrophone()}>
          <Recording
            width="96"
            height="96"
            className={
              `cursor-pointer` + !!userMedia && !!microphone && micOpen
                ? "fill-red-400 drop-shadow-glowRed"
                : "fill-gray-600"
            }
          />
        </button>
           <div className="mt-20 p-6 text-xl text-center">
          {caption && micOpen
            ? caption
            : "** Realtime transcription by Deepgram **"}
        </div> 
      </div>
     <div
        className="z-20 text-white flex shrink-0 grow-0 justify-around items-center 
                  fixed bottom-0 right-5 rounded-lg mr-1 mb-5 lg:mr-5 lg:mb-5 xl:mr-10 xl:mb-10 gap-5"
      >
        <span className="text-sm text-gray-400">
          {isListening
            ? "Deepgram connection open!"
            : "Deepgram is connecting..."}
        </span>
        <Dg
          width="30"
          height="30"
          className={
            isListening ? "fill-white drop-shadow-glowBlue" : "fill-gray-600"
          }
        />
      </div> 
    </div> */
  );
}
