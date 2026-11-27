/**
 * The old name of the team's line. PayView and the share page still import
 * TeamStyleRow (same props: token, data, demo, hideMeter); it is TeamLine now,
 * and the editor that used to open inline is its own route
 * (/hackathon/join/<token>/team, ./TeamEditor.tsx).
 */
export { TeamLine as TeamStyleRow } from "./TeamLine";
