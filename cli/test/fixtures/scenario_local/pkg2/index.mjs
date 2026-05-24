import { bob } from "pkg1/other";
import "pkg1";

export function foo() {
  console.log("foo");
  bob();
}
