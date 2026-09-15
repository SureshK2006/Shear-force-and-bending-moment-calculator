export default function ConventionNote() {
  return (
    <section className="panel-card convention">
      <h2>Sign convention</h2>
      <ul>
        <li>
          <strong>Loads:</strong> downward point loads and UDLs are positive.
        </li>
        <li>
          <strong>Applied moments:</strong> clockwise is positive.
        </li>
        <li>
          <strong>Reactions:</strong> upward force is positive. Support moments follow sagging-positive.
        </li>
        <li>
          <strong>Shear:</strong> positive when the left face is pushed upward (standard left-to-right section).
        </li>
        <li>
          <strong>Bending moment:</strong> sagging (tension at bottom) is positive; hogging is negative.
        </li>
      </ul>
      <p className="hint">
        SFD is plotted with positive shear upward. BMD can be shown with sagging upward, or flipped onto the tension
        side.
      </p>
    </section>
  )
}
