export default function Toast({ message, visible }) {
  return <div className={"toast" + (visible ? " is-visible" : "")}>{message}</div>;
}
