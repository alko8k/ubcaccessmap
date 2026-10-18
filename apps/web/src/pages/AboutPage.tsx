import { useDocumentTitle } from "../lib/useDocumentTitle.ts";

export function AboutPage() {
  useDocumentTitle("About");
  return (
    <main className="page prose">
      <p className="eyebrow">About</p>
      <h1>A washroom map that puts access facts first</h1>
      <p className="lede">
        A student-built campus directory for finding a washroom when you need one, with
        accessibility facts kept separate from community taste.
      </p>
      <p>
        This project is not affiliated with, endorsed by, or maintained by the University of
        British Columbia. Building footprints come from UBC Campus and Community Planning open
        data, released under the Public Domain Dedication and License v1.0.
      </p>
      <p>
        We acknowledge that UBC Vancouver is located on the traditional, ancestral, and unceded
        territory of the xʷməθkʷəy̓əm (Musqueam) people.
      </p>
      <h2>How ranking works</h2>
      <p>
        Verified UBC emails can rate cleanliness, privacy, availability, and overall experience.
        Those scores are combined with a Bayesian prior so one 5-star vote cannot create an S
        rank. Accessibility fields are never inferred from popularity.
      </p>
      <h2>Privacy</h2>
      <p>
        We store a hashed magic-link token and a session cookie. Display names are generated from
        the email local part. Student numbers and ID images are not collected. Email verification
        shows affiliation with an allowed UBC domain; it does not prove current enrolment.
      </p>
      <h2>Credits</h2>
      <p>
        Building data © UBC Campus and Community Planning, PDDL 1.0. Map tiles © OpenFreeMap,
        OpenMapTiles, and OpenStreetMap contributors.
      </p>
    </main>
  );
}
