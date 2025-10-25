import "pkg1";
import { bob } from "pkg1/other";

export function foo() {
  console.log("foo");
  bob();
}
