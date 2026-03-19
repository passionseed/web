import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HoldToTalk } from "./HoldToTalk";

// Mock MediaRecorder
const mockStart = jest.fn();
const mockStop = jest.fn();
let mediaRecorderOnDataAvailable: ((event: { data: Blob }) => void) | null = null;
let mediaRecorderOnStop: (() => void) | null = null;

class MockMediaRecorder {
  static isTypeSupported = jest.fn().mockReturnValue(true);
  
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state: "inactive" | "recording" = "inactive";
  
  constructor() {
    this.ondataavailable = null;
    this.onstop = null;
  }
  
  start = mockStart.mockImplementation(() => {
    this.state = "recording";
  });
  
  stop = mockStop.mockImplementation(() => {
    this.state = "inactive";
    // Call callbacks asynchronously to simulate real behavior
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({ data: new Blob(["test-audio"], { type: "audio/webm" }) });
      }
      if (this.onstop) {
        this.onstop();
      }
    }, 0);
  });
}

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn().mockResolvedValue({
  getTracks: () => [{ stop: jest.fn() }],
});

Object.defineProperty(navigator, "mediaDevices", {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

// Mock MediaRecorder constructor
global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

// Mock fetch for transcription API
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("HoldToTalk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetUserMedia.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ text: "Hello world" }),
    } as unknown as Response);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("starts recording on pointer down and stops on pointer up", async () => {
    const onPartial = jest.fn();
    const onTranscribed = jest.fn();

    render(
      <HoldToTalk
        onPartial={onPartial}
        onTranscribed={onTranscribed}
        language="en"
      />
    );

    const button = screen.getByRole("button", { name: "Hold to talk" });

    Object.defineProperty(button, "setPointerCapture", {
      configurable: true,
      value: jest.fn(),
    });

    // Start recording
    fireEvent.pointerDown(button, { pointerId: 1 });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledTimes(1);

    // Should show listening state
    expect(onPartial).toHaveBeenCalledWith("Listening...");

    // Stop recording
    fireEvent.pointerUp(button, { pointerId: 1 });

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    // Should show processing state
    expect(onPartial).toHaveBeenCalledWith("Processing...");

    // Should call transcription API
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/expert-interview/transcribe",
      expect.objectContaining({ method: "POST" })
    );

    // Wait for the fetch to resolve
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Should call onTranscribed with the text (not send directly)
    expect(onTranscribed).toHaveBeenCalledWith("Hello world");
  });

  test("passes chat history to transcription API", async () => {
    const onPartial = jest.fn();
    const onTranscribed = jest.fn();
    const chatHistory = [
      { role: "assistant" as const, content: "What is your role?" },
      { role: "user" as const, content: "I am a software engineer" },
    ];

    render(
      <HoldToTalk
        onPartial={onPartial}
        onTranscribed={onTranscribed}
        language="en"
        chatHistory={chatHistory}
      />
    );

    const button = screen.getByRole("button", { name: "Hold to talk" });

    Object.defineProperty(button, "setPointerCapture", {
      configurable: true,
      value: jest.fn(),
    });

    fireEvent.pointerDown(button, { pointerId: 1 });

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.pointerUp(button, { pointerId: 1 });

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/expert-interview/transcribe",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      })
    );

    // Verify FormData contains chat history
    const call = mockFetch.mock.calls[0];
    const formData = call[1].body as FormData;
    expect(formData.get("chatHistory")).toBe(JSON.stringify(chatHistory));
  });

  test("shows Thai labels when language is th", () => {
    render(
      <HoldToTalk
        onPartial={jest.fn()}
        onTranscribed={jest.fn()}
        language="th"
      />
    );

    expect(screen.getByRole("button", { name: "กดค้างเพื่อพูด" })).toBeInTheDocument();
  });

  test("is disabled when disabled prop is true", () => {
    render(
      <HoldToTalk
        onPartial={jest.fn()}
        onTranscribed={jest.fn()}
        disabled
      />
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});