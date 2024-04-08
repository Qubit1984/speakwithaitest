import AWS from "aws-sdk";

const polly: AWS.Polly = new AWS.Polly({
  region: "ap-northeast-1", // 替换为你的AWS区域
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_POLLY_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_POLLY_SECRET_KEY,
  },
});

export default async function speakMessage(message: string) {
  try {
    const response = await polly
      .synthesizeSpeech({
        Engine: "neural",
        Text: message,
        OutputFormat: "mp3",
        VoiceId: "Kevin", // 替换为你喜欢的语音ID
      })
      .promise();

    const arrayBuffer = response.AudioStream.buffer;
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
    const blobUrl = URL.createObjectURL(blob);
    const audioElement = new Audio(blobUrl);

    // 播放音频
    audioElement.play();
  } catch (error) {
    console.error("Error synthesizing speech:", error);
  }
}
