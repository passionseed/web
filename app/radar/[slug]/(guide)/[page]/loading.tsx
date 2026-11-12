/**
 * In-shell placeholder while a level loads, so moving between levels keeps the
 * header and sticky nav and never flashes the deck skeleton.
 */
export default function GuideLevelLoading() {
  return (
    <div className="rg-level rg-level--loading" role="status" aria-label="กำลังโหลดด่าน">
      <div className="rg-level__scene-skeleton" />
      <div className="rg-level__line-skeleton" />
      <div className="rg-level__line-skeleton rg-level__line-skeleton--short" />
    </div>
  );
}
