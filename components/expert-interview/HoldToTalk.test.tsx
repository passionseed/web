import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useScribe } from "@elevenlabs/react";
import { HoldToTalk } from "./HoldToTalk";

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

let latestOptions: Parameters<typeof useScribe>[0] | undefined;

jest.mock("@elevenlabs/react", () => ({
  useScribe: jest.fn((options) => {
    latestOptions = options;

    return {
      connect: mockConnect,
      disconnect: mockDisconnect,
      isConnected: false,
    };
  }),
}));

describe("HoldToTalk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestOptions = undefined;
    mockConnect.mockResolvedValue(undefined);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue("test-token"),
    } as unknown as Response);
  });

  test("waits for the realtime connection to open before disconnecting after an early release", async () => {
    render(
      <HoldToTalk
        onPartial={jest.fn()}
        onCommitted={jest.fn()}
        language="en"
      />
    );

    const button = screen.getByRole("button", { name: "Hold to talk" });

    Object.defineProperty(button, "setPointerCapture", {
      configurable: true,
      value: jest.fn(),
    });

    fireEvent.pointerDown(button, { pointerId: 1 });
    fireEvent.pointerUp(button, { pointerId: 1 });

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    expect(mockDisconnect).not.toHaveBeenCalled();

    await act(async () => {
      latestOptions?.onConnect?.();
    });

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });
});
