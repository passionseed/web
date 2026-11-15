import { fireEvent, render, screen } from "@testing-library/react";

import { IslandRefresh } from "../IslandRefresh";
import { useIslandRefresh } from "../useIslandRefresh";

const mockRefresh = jest.fn();
const router = { refresh: mockRefresh };
jest.mock("next/navigation", () => ({ useRouter: () => router }));

it("refreshes the route and local quest readers together without reloading the document", () => {
  const canvasReload = jest.fn();
  function QuestReader() {
    useIslandRefresh(canvasReload);
    return <input aria-label="draft" defaultValue="my unsent work" />;
  }
  render(<><IslandRefresh className="refresh" /><QuestReader /></>);
  fireEvent.click(screen.getByRole("button", { name: "รีเฟรชเควสต์และแคนวาส" }));
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(canvasReload).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("textbox", { name: "draft" })).toHaveValue("my unsent work");
});
