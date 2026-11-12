import { fireEvent, render, screen } from "@testing-library/react";

import { answerIslandParent, withdrawIslandParent } from "@/app/shift/island/parent/actions";

import { ISLAND_PARENT } from "../consent/copy";
import { IslandParentForm, type IslandParentDecision } from "../consent/IslandParentForm";

jest.mock("@/app/shift/island/parent/actions", () => ({
  answerIslandParent: jest.fn(),
  withdrawIslandParent: jest.fn(),
}));

const mockedAnswer = answerIslandParent as jest.MockedFunction<typeof answerIslandParent>;
const mockedWithdraw = withdrawIslandParent as jest.MockedFunction<typeof withdrawIslandParent>;

const TOKEN = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
const NICK = "มิ้นต์";

function form(decision: IslandParentDecision | null = null) {
  return render(
    <IslandParentForm token={TOKEN} decision={decision} nickname={NICK}>
      <p>Notice rows</p>
    </IslandParentForm>,
  );
}

function fillIn() {
  fireEvent.change(screen.getByLabelText(ISLAND_PARENT.name), { target: { value: "สมศรี ใจดี" } });
  fireEvent.click(screen.getByRole("button", { name: "แม่" }));
}

const confirmBox = () => screen.getByRole("checkbox", { name: ISLAND_PARENT.confirm(NICK) });
const aiBox = () => screen.getByRole("checkbox", { name: ISLAND_PARENT.ai(NICK) });

beforeEach(() => {
  mockedAnswer.mockReset().mockResolvedValue({ ok: true });
  mockedWithdraw.mockReset().mockResolvedValue({ ok: true });
});

describe("IslandParentForm", () => {
  it("shows the notice, names only the nickname, and keeps agree off until the tick", () => {
    form();
    expect(screen.getByText("Notice rows")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: ISLAND_PARENT.relationship(NICK) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ISLAND_PARENT.agree })).toBeDisabled();
    expect(aiBox()).not.toBeChecked();
  });

  it("agrees without the AI news by default", async () => {
    form();
    fillIn();
    fireEvent.click(confirmBox());
    fireEvent.click(screen.getByRole("button", { name: ISLAND_PARENT.agree }));
    expect(await screen.findByRole("status")).toHaveTextContent(ISLAND_PARENT.done.agreed);
    expect(mockedAnswer).toHaveBeenCalledWith({
      token: TOKEN,
      agree: true,
      ai: false,
      parentName: "สมศรี ใจดี",
      relationship: "แม่",
      confirmed: true,
    });
    expect(screen.getByRole("button", { name: ISLAND_PARENT.withdraw })).toBeInTheDocument();
  });

  it("agrees with the separate AI tick", async () => {
    form();
    fillIn();
    fireEvent.click(confirmBox());
    fireEvent.click(aiBox());
    fireEvent.click(screen.getByRole("button", { name: ISLAND_PARENT.agree }));
    expect(await screen.findByRole("status")).toHaveTextContent(ISLAND_PARENT.done.agreedAi);
    expect(mockedAnswer).toHaveBeenCalledWith(expect.objectContaining({ agree: true, ai: true }));
  });

  it("declines, never sending the AI tick, and can change its mind", async () => {
    form();
    fillIn();
    fireEvent.click(aiBox());
    fireEvent.click(screen.getByRole("button", { name: ISLAND_PARENT.decline }));
    expect(await screen.findByRole("status")).toHaveTextContent(ISLAND_PARENT.done.declined(NICK));
    expect(mockedAnswer).toHaveBeenCalledWith(expect.objectContaining({ agree: false, ai: false }));
    fireEvent.click(screen.getByRole("button", { name: ISLAND_PARENT.changeMind }));
    expect(screen.getByRole("button", { name: ISLAND_PARENT.agree })).toBeInTheDocument();
  });

  it("on an AI-line link, saying no keeps the earlier consent and says so", async () => {
    render(
      <IslandParentForm token={TOKEN} decision={null} nickname={NICK} aiOnly>
        <p>Notice rows</p>
      </IslandParentForm>,
    );
    fillIn();
    fireEvent.click(screen.getByRole("button", { name: ISLAND_PARENT.aiOnly.decline }));
    expect(await screen.findByText(ISLAND_PARENT.done.kept(NICK))).toBeInTheDocument();
    expect(mockedAnswer).toHaveBeenCalledWith(expect.objectContaining({ agree: false, ai: false }));
  });

  it("asks for the name and relationship before sending", () => {
    form();
    fireEvent.click(screen.getByRole("button", { name: ISLAND_PARENT.decline }));
    expect(screen.getByRole("alert")).toHaveTextContent(ISLAND_PARENT.errors.name);
    fireEvent.change(screen.getByLabelText(ISLAND_PARENT.name), { target: { value: "สมศรี ใจดี" } });
    fireEvent.click(screen.getByRole("button", { name: ISLAND_PARENT.decline }));
    expect(screen.getByRole("alert")).toHaveTextContent(ISLAND_PARENT.errors.relationship);
    expect(mockedAnswer).not.toHaveBeenCalled();
  });

  it("shows the server's words when the link is dead", async () => {
    mockedAnswer.mockResolvedValue({ ok: false, error: ISLAND_PARENT.errors.linkDead });
    form();
    fillIn();
    fireEvent.click(confirmBox());
    fireEvent.click(screen.getByRole("button", { name: ISLAND_PARENT.agree }));
    expect(await screen.findByRole("alert")).toHaveTextContent(ISLAND_PARENT.errors.linkDead);
  });

  it("withdraws an agreement from the same link", async () => {
    form("agreed");
    expect(screen.getByText("Notice rows")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: ISLAND_PARENT.withdraw }));
    expect(await screen.findByText(ISLAND_PARENT.done.withdrawn)).toBeInTheDocument();
    expect(mockedWithdraw).toHaveBeenCalledWith(TOKEN);
    expect(screen.queryByRole("button", { name: ISLAND_PARENT.withdraw })).toBeNull();
  });

  it("shows a withdrawn link as withdrawn, with nothing to press", () => {
    form("withdrawn");
    expect(screen.getByRole("status")).toHaveTextContent(ISLAND_PARENT.done.withdrawn);
    expect(screen.queryByRole("button", { name: ISLAND_PARENT.withdraw })).toBeNull();
    expect(screen.queryByRole("button", { name: ISLAND_PARENT.agree })).toBeNull();
  });
});
