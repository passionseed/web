import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CareerRequestResult, GuideTracker } from "@/lib/radar-guide/types";
import { CareerRequestForm } from "../CareerRequestForm";
import { careerRequestMessage } from "../guide-helpers";

function makeTracker(result: CareerRequestResult | Error = "ok") {
  return {
    visitId: null,
    track: jest.fn(),
    submitCareerRequest: jest.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  } satisfies GuideTracker;
}

function submit(text: string) {
  const input = screen.getByLabelText("อยากให้ทำอาชีพไหนต่อ?");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /ส่ง/ }));
  return input;
}

test("the input is capped at 80 characters with the spec placeholder", () => {
  render(<CareerRequestForm tracker={makeTracker()} />);
  const input = screen.getByLabelText("อยากให้ทำอาชีพไหนต่อ?");
  expect(input).toHaveAttribute("maxLength", "80");
  expect(input).toHaveAttribute("placeholder", "เช่น นักบัญชี หมอฟัน นักออกแบบเกม");
  expect(screen.getByText("หรือคอมเมนต์ชื่ออาชีพใต้คลิปใน IG ก็ได้")).toBeInTheDocument();
});

test.each(["https://x.com", "www.a.th", "@someone", "a@b.co", "081 234 5678"])(
  "contact details (%s) are refused before any request",
  async (text) => {
    const tracker = makeTracker();
    render(<CareerRequestForm tracker={tracker} />);
    submit(text);
    expect(await screen.findByText(careerRequestMessage("invalid")!)).toBeInTheDocument();
    expect(tracker.submitCareerRequest).not.toHaveBeenCalled();
  }
);

test("a valid career is sent normalised; success clears the field", async () => {
  const tracker = makeTracker("ok");
  render(<CareerRequestForm tracker={tracker} />);
  const input = submit("  เชฟร้าน   เบอร์เกอร์ ");
  expect(await screen.findByText("รับแล้ว ถ้ามีคนขอเยอะ เราจะทำเป็นตอนต่อไป")).toBeInTheDocument();
  expect(tracker.submitCareerRequest).toHaveBeenCalledWith("เชฟร้าน เบอร์เกอร์");
  expect(input).toHaveValue("");
});

test("rate-limited maps to the try-again-in-an-hour message", async () => {
  render(<CareerRequestForm tracker={makeTracker("rate_limited")} />);
  submit("นักบัญชี");
  expect(await screen.findByText("ส่งเยอะไปหน่อย ลองใหม่อีกชั่วโมงนะ")).toBeInTheDocument();
});

test("a server-side invalid maps to the invalid message", async () => {
  render(<CareerRequestForm tracker={makeTracker("invalid")} />);
  submit("นักบัญชี");
  expect(await screen.findByText("ขอแค่ชื่ออาชีพนะ ลองพิมพ์ใหม่อีกที")).toBeInTheDocument();
});

test("a thrown error maps to failed", async () => {
  render(<CareerRequestForm tracker={makeTracker(new Error("network"))} />);
  submit("ไลน์แมน");
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(careerRequestMessage("failed")!)
  );
});

test("careerRequestMessage covers every state", () => {
  expect(careerRequestMessage("idle")).toBeNull();
  expect(careerRequestMessage("submitting")).toBeNull();
  for (const state of ["ok", "invalid", "rate_limited", "failed"] as const) {
    expect(careerRequestMessage(state)).toEqual(expect.any(String));
  }
});
