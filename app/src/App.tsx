/**
 * Task 1 scaffold. Deliberately minimal — this proves the token pipeline
 * (paper background, self-hosted fonts, no raw hex) before any real
 * component work starts in Task 2+.
 *
 * See DESIGN_RISO1/IMPLEMENTATION_PLAN.md and
 * https://github.com/chevapa/travel-around/issues/86 (Task 1).
 */
export default function App() {
  return (
    <main
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--s-9)",
      }}
    >
      <p
        style={{
          font: "var(--label)",
          letterSpacing: "var(--label-tracking)",
          textTransform: "uppercase",
          color: "var(--text-quiet)",
        }}
      >
        RISO1 scaffold — Task 2 onward builds here
      </p>
    </main>
  );
}
