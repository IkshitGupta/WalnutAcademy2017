/**
 * Single source of truth for everything the site says about the school.
 *
 * Wording marked as coming from the prospectus is the school's own published
 * text, lightly copy-edited. Nothing here asserts a fact the school has not
 * confirmed.
 */

export const school = {
  name: "Walnut Academy",
  tagline: "A Foundation For The Future",
  secondaryTagline: "Enter the world of learning with fun and joy",
  descriptor: "An English Medium School",
  established: 2017,
  society: "Shri Sanjivani Shiksha Samiti",
  /**
   * The school holds Rajasthan state recognition, not CBSE affiliation. The
   * number is always shown with this label: a bare "Affiliation No." reads, in
   * the Indian school context, as a claim of board affiliation.
   */
  recognition: "Rajasthan state recognition",
  recognitionNo: "RJJAI27726",
  locality: "Mansarovar, Jaipur",
} as const;

/**
 * The affiliation the school does not hold.
 *
 * Deliberately a plain rule. It grew, over several rounds, into Unicode
 * normalisation and a derived separator class, to catch the word spelled
 * with a soft hyphen, a left-to-right mark or a fullwidth alphabet. Nothing
 * writes this site's text but this file, so that was defending against an
 * attacker who does not exist, and the machinery cost more than it protected:
 * read loosely enough to catch an invisible character, the same rule read
 * `c && b(s, e)` in a minified chunk as the board's name.
 *
 * What it has to catch is someone here typing the word. Dots and spaces are
 * allowed for because a person might write C.B.S.E.
 */
export const boardClaim =
  /\bC[.\s]*B[.\s]*S[.\s]*E\b|Central\s+Board\s+of\s+Secondary\s+Education/i;

/**
 * The school is recognised by the state and affiliated to no board, so the
 * word belongs nowhere on the site: "not affiliated to any board" fails the
 * build as surely as a claim does, because a page is better off not raising
 * the question.
 */
export const affiliationClaim = /affiliat/i;

/** Where the school is, for anything that turns an instant into a date. */
const SCHOOL_UTC_OFFSET = "+05:30";

/**
 * The days the office keeps, in the order a week is read. Both the sentence a
 * parent reads and the week handed to search engines are built from this.
 */
const OFFICE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * The session being advertised, on the bar above the header and in the Visit
 * panel.
 *
 * Worked out from the date once, on the reading that admissions open each
 * November. Nobody had confirmed that month, so the line changed what it
 * claimed on a date the school had not chosen. It is written out now, so it
 * says only what it has been told to say.
 *
 * The cost is that it is the school's to keep current: these are static files,
 * and nothing here will notice a session going by.
 */
export const admissions = {
  label: "Admissions open for",
  session: "2026–27",
} as const;

/** No trailing slash: every URL built from this appends its own. */
export const siteUrl = "https://walnutacademy.in";

export const contact = {
  phoneDisplay: "+91 96948 53435",
  phoneHref: "tel:+919694853435",
  whatsappHref: "https://wa.me/919694853435",
  email: "walnutacademy2017@gmail.com",
  addressLines: [
    "175, Prajapati Vihar",
    "Patrakar Colony Road, Mansarovar",
    "Behind Harshdeep Marriage Garden",
    "Jaipur, Rajasthan 302020",
  ],
  mapsHref:
    "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(
      "Walnut Academy, 175 Prajapati Vihar, Patrakar Colony Road, Mansarovar, Jaipur, Rajasthan 302020",
    ),
  hours: [
    { label: "School", value: "8:30 AM – 2:00 PM" },
    { label: "Office", value: "8:00 AM – 3:00 PM" },
  ],
  /**
   * The working week, which the two time ranges above do not convey. The span
   * is built from the same list the structured data is, so the sentence a
   * parent reads and the week a search engine is handed cannot come to say
   * different things.
   *
   * The exception the school keeps is tied to the day it is about, so a week
   * that stopped at Friday would not go on promising a Saturday off.
   */
  hoursNote: [
    `${OFFICE_DAYS[0]} to ${OFFICE_DAYS[OFFICE_DAYS.length - 1]}`,
    ...(OFFICE_DAYS.includes("Saturday") ? ["Every 2nd Saturday off"] : []),
  ].join(" · "),
  /** Used for local search; taken from the school's earlier site. */
  geo: { latitude: 26.8568, longitude: 75.764 },
  /** Structured form of the address, so the markup and JSON-LD cannot drift. */
  postalAddress: {
    streetAddress: "175, Prajapati Vihar, Patrakar Colony Road",
    addressLocality: "Mansarovar, Jaipur",
    addressRegion: "Rajasthan",
    postalCode: "302020",
    addressCountry: "IN",
  },
  /**
   * Office hours drive the structured data, because that is the window in
   * which a visitor can actually reach someone. School hours are narrower and
   * are shown as visible text only.
   *
   * Saturday is included although the office is shut on the second of each
   * month, which the vocabulary has no way to say. Leaving the day out states
   * the opposite of the truth on the three or four Saturdays the school does
   * keep, and a listing is read as the whole week; naming it is wrong once a
   * month instead of three times. The exception is written beside the visible
   * lines, and the standing closures are better carried by the Google
   * Business Profile, where a closed date can be entered one at a time.
   */
  openingHours: {
    days: OFFICE_DAYS,
    opens: "08:00",
    closes: "15:00",
  },
} as const;

/**
 * Both ranges are shown together in the hero, so a visitor can see when the
 * school day runs and when there is someone there to answer the phone.
 */
const [schoolHours, officeHours] = contact.hours;

export const stats = [
  { value: "2017", label: "Established", icon: "calendar" },
  { value: "250+", label: "Students", icon: "students" },
  { value: "12+", label: "Teachers", icon: "teachers" },
  { value: "10+", label: "Classes", icon: "classes" },
] as const;

/** Prospectus, opening paragraph. */
export const story = [
  "Walnut Academy provides a child-friendly, safe, secure, caring and stimulating environment, where we nurture your child and give them a quality education.",
  "Our firm belief about teaching is learning by playing, by doing, and in an interactive way. Everything follows from that. Our ambience, our curriculum, our activities, our teaching aids, our toys and our equipment are all designed in a fun-loving manner.",
];

/** Prospectus, mission statement. */
export const mission =
  "Our mission is to promote children’s physical, cognitive, moral, emotional and social development through play and structured activities. Our school nurtures and guides children to achieve their full potential through a child-centric curriculum in everyday school life. We are committed to imbibing moral values and good manners for the positive growth of the children.";

/** The room the opening paragraph describes, photographed for the school. */
export const classroom = {
  src: "classroom",
  alt: "A Walnut Academy classroom: low coloured chairs in a row, open shelves of books and toys, and a painted solar system across the wall",
} as const;

/** Prospectus, "Our Techniques", plus a fifth drawn from the mission statement. */
export const techniques = [
  {
    title: "Child-Centric Curriculum",
    body: "Lessons are shaped around the child rather than the other way around.",
  },
  {
    title: "Activity-Based Learning",
    body: "Children learn by doing: building, making, moving and trying things out.",
  },
  {
    title: "Play Way Method",
    body: "Play is how young children make sense of the world, so play is how we teach.",
  },
  {
    title: "Positive Reinforcement",
    body: "Encouragement rather than correction is what builds a confident learner.",
  },
  {
    title: "Moral Values & Good Manners",
    body: "Everyday courtesy and good habits are taught alongside every lesson.",
  },
];

/**
 * `colour` is decorative; `textColour` is a darkened variant that clears WCAG
 * AA against white for the heading.
 */
export const prePrimary = [
  {
    name: "Play Group",
    colour: "var(--color-class-playgroup)",
    textColour: "var(--color-class-playgroup-text)",
    body: "First steps away from home, spent settling in, sharing and learning through play.",
  },
  {
    name: "Nursery",
    colour: "var(--color-class-nursery)",
    textColour: "var(--color-class-nursery-text)",
    body: "Sounds, shapes, colours and early speech, introduced through activity.",
  },
  {
    name: "K.G.",
    colour: "var(--color-class-kg)",
    textColour: "var(--color-class-kg-text)",
    body: "Letters and numbers, and the confidence to start using them.",
  },
  {
    name: "Prep",
    colour: "var(--color-class-prep)",
    textColour: "var(--color-class-prep-text)",
    body: "Reading, writing and the readiness that formal school asks for.",
  },
];

/** The pre-primary colours, in class order, used wherever the motif appears. */
export const stripe = prePrimary.map((stage) => stage.colour);

export const schoolClasses = {
  list: [
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
  ],
  body: "Foundation subjects taught in English, with activity and practice in equal measure.",
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const roman = (className: string) =>
  ROMAN[Number(className.replace(/\D/g, "")) - 1] ?? className;

/**
 * The numbered classes are shown as one stage naming its span rather than as
 * eight panels of their own. "Primary" is not used for it: the word is read as
 * Class 1 to 5 by most of Jaipur and as Class 1 to 8 elsewhere, and the school
 * now teaches the whole of the wider range, so the word would mislead whichever
 * way it was taken. Naming the span in the Roman numerals the school uses on
 * its own signage says it without the word at all. Derived from the list so it
 * stays true to the classes the school runs, and shared with the export check
 * so the test asserts the label that actually renders.
 */
export const schoolClassesLabel = `Classes ${roman(schoolClasses.list[0])}–${roman(
  schoolClasses.list[schoolClasses.list.length - 1],
)}`;

/**
 * The whole span in words, from the first stage a child can join to the last
 * class the school runs.
 *
 * Typed out by hand in five places once, in the quick facts, the classes
 * heading, the careers opening and both descriptions a search engine is given.
 * A list that grew left those five disagreeing with each other and with the
 * classes beneath them, and a check reading the finished page could only ever
 * catch the spellings it had been taught to look for. Built from the lists
 * instead, they cannot fall out of step in the first place.
 */
const firstStage = prePrimary[0].name;

/** The furthest a child can go here, which the export check reads too. */
export const lastClassTaught =
  schoolClasses.list[schoolClasses.list.length - 1];

export const classRange = `${firstStage} to ${lastClassTaught}`;

/** The same span, where the sentence around it reads better with "through". */
export const classRangeHeading = `${firstStage} through ${lastClassTaught}`;

export const quickFacts = [
  { label: classRange, detail: null, icon: "classes" },
  { label: "English Medium", detail: null, icon: "language" },
  {
    label: `${schoolHours.label} ${schoolHours.value}`,
    detail: `${officeHours.label} ${officeHours.value}`,
    icon: "clock",
  },
  { label: school.locality, detail: null, icon: "pin" },
] as const;

/** Prospectus, "Fun Learning Areas". */
export const learningAreas = [
  {
    title: "Science Area",
    icon: "science",
    body: "The natural world of earth, plants, animals, birds, seasons and food, explored by observing with all five senses.",
  },
  {
    title: "Maths Corner",
    icon: "math",
    body: "Early number concepts and simple calculation, taught in an interesting and enjoyable way.",
  },
  {
    title: "Computer Corner",
    icon: "computer",
    body: "The basics of computing, introduced gently through educational software.",
  },
  {
    title: "Block Area",
    icon: "blocks",
    body: "Open-ended building materials that develop both muscles and mind, and teach size, sequence, colour and number.",
  },
  {
    title: "Creative Art Area",
    icon: "art",
    body: "Room for self-expression, building skill and confidence with a wide range of tools and materials.",
  },
  {
    title: "Clay Art",
    icon: "clay",
    body: "Touching, exploring and moulding, which develops imagination, dexterity and creativity.",
  },
  {
    title: "Drama & Puppet Area",
    icon: "drama",
    body: "Society, culture and character understood by acting them out, through story and puppetry.",
  },
  {
    title: "Dance & Music Area",
    icon: "music",
    body: "Rhythm, movement and instruments, which build the confidence to stand up and take part.",
  },
  {
    title: "Ample Play Area",
    icon: "play",
    body: "Generous space designed specifically for children to play, move and let off steam.",
  },
] as const;

/** Prospectus "Salient Features", reconciled against what still operates today. */
export const features = [
  {
    label: "Safe, secure and hygienic environment",
    icon: "safety",
    group: "Safety and care",
  },
  {
    label: "Spacious air-conditioned classrooms",
    icon: "airCon",
    group: "Safety and care",
  },
  { label: "CCTV surveillance", icon: "cctv", group: "Safety and care" },
  { label: "RO drinking water", icon: "water", group: "Safety and care" },
  {
    label: "Regular medical check-ups",
    icon: "medical",
    group: "Safety and care",
  },
  { label: "School transport", icon: "transport", group: "Safety and care" },

  {
    label: "Well-trained and motivated staff",
    icon: "staff",
    group: "Learning",
  },
  { label: "Audio-visual activities", icon: "audioVisual", group: "Learning" },
  { label: "Kids’ library", icon: "library", group: "Learning" },
  { label: "Computer facility", icon: "computer", group: "Learning" },
  { label: "Educational field trips", icon: "trips", group: "Learning" },

  {
    label: "Ball pool and sand-pit activities",
    icon: "sandPit",
    group: "Play and family",
  },
  { label: "Splash pool in summers", icon: "splash", group: "Play and family" },
  {
    label: "Parent-teacher meets and counselling",
    icon: "parents",
    group: "Play and family",
  },
] as const;

/**
 * Draft messages, written from confirmed facts only, for Dr. Rekha Gupta and
 * Surender Mohan Gupta to edit or replace in their own words.
 *
 * The principal looks back over the years already behind the school, so her
 * message says how far children have come rather than naming the class they
 * reach. That keeps it true while the upper classes are still filling.
 */
export const leadership = [
  {
    name: "Dr. Rekha Gupta",
    role: "Principal",
    imageBase: "/images/principal",
    imageWidths: [360, 720],
    message: [
      "When a child walks through our gate for the first time, they are usually holding a parent’s hand very tightly. Our first job is not teaching at all. It is making that child feel safe enough to let go.",
      "Everything here is built around that. Our classrooms are bright and comfortable, children learn by doing rather than by copying, and we take the time to know each child by name and by nature.",
      "Since 2017 we have watched hundreds of children grow from a hesitant first day in Play Group to reading and questioning their way up through the school. It is a privilege, and we do not take it lightly.",
      "Do come and visit us. A school is best understood by walking through it.",
    ],
  },
  {
    name: "Surender Mohan Gupta",
    role: "Director",
    imageBase: "/images/director",
    // The source is only 696px wide, so the larger rendition is not upscaled
    // and its descriptor has to match the file rather than the requested size.
    imageWidths: [360, 696],
    message: [
      "Walnut Academy was founded in 2017 with a straightforward intention: to build a school in Mansarovar where young children are genuinely cared for, not simply enrolled.",
      "We chose to begin at the very beginning, with Play Group, because the earliest years shape everything that follows. Our motto, A Foundation For The Future, is meant quite literally.",
      "We have grown steadily since, and have tried to grow in the ways that matter. That means better facilities, well-trained teachers, and safe, well-supervised days.",
    ],
  },
];

/** Profiles the school actually maintains, also used for JSON-LD `sameAs`. */
export const social = [
  {
    label: "Facebook",
    icon: "facebook",
    href: "https://www.facebook.com/people/Walnut-Academy/100057252888320/",
  },
  {
    label: "YouTube",
    icon: "youtube",
    href: "https://www.youtube.com/@walnutacademy2017",
  },
] as const;

/**
 * Photographs from the school's own albums, one per occasion. `alt` describes
 * the picture for anyone who cannot see it; `caption` names the day.
 */
export const moments = [
  {
    src: "holi",
    caption: "Holi",
    alt: "Children in bright clothes celebrating Holi at school",
  },
  {
    src: "childrens-day",
    caption: "Children’s Day",
    alt: "Children gathered around a decorated cake on Children’s Day",
  },
  {
    src: "green-day",
    caption: "Green Day",
    alt: "Children dressed in green in front of a decorated board",
  },
  {
    src: "janmashtami",
    caption: "Janmashtami",
    alt: "Children in festival dress for Janmashtami, under strings of bunting",
  },
  {
    src: "pool-party",
    caption: "Pool Party",
    alt: "Children playing in the splash pool among coloured balls",
  },
  {
    src: "christmas",
    caption: "Christmas",
    alt: "Children in red and white beneath a Merry Christmas banner",
  },
  {
    src: "mango-day",
    caption: "Mango Day",
    alt: "Children holding their work beside a Mango Day display",
  },
  {
    src: "rhyme-recitation",
    caption: "Rhyme Recitation",
    alt: "Children gathered at the lectern for the rhyme recitation competition",
  },
  {
    src: "shape-day",
    caption: "Shape Day",
    alt: "Children holding certificates in front of the Shapes Day board",
  },
  {
    src: "earth-day",
    caption: "Earth Day",
    alt: "Children wearing leaf headbands for Earth Day",
  },
] as const;

/**
 * Absolute rather than bare fragments, so the same links work from a page that
 * is not the homepage. The shared header, footer and announcement bar are
 * rendered on every route.
 */
export const navLinks = [
  { href: "/#about", label: "About" },
  { href: "/#classes", label: "Classes" },
  { href: "/#learning", label: "Learning" },
  { href: "/#facilities", label: "Facilities" },
  { href: "/#moments", label: "Moments" },
  { href: "/#visit", label: "Visit Us" },
];

/**
 * The switch for a real opening. Set `active` to false once the post is filled
 * and the page returns to the standing invitation, taking the JobPosting
 * markup with it.
 *
 * The closing day is the second catch and the more important one. An export is
 * built once and then left alone, so if nobody rebuilds, it is what tells a
 * search engine the posting has closed and what tells the page to stop
 * showing it. Leaving a filled post advertised is a policy breach, not an
 * oversight, so it is required here rather than optional.
 *
 * Nothing in here may be guessed. Anything the school has not settled is left
 * out, which is why there is no salary and no list of requirements.
 */
export const vacancy = {
  active: true,
  title: "Teacher",
  employmentType: "FULL_TIME",
  datePosted: "2026-09-30",
  closingDay: "2026-12-31",
  summary:
    "A full-time teaching post. We settle which classes you take once we have met you.",
} as const;

/**
 * The single instant the post closes, at the end of its closing day where the
 * school is. Anything that decides whether the post is open reads this, so a
 * visitor abroad, the build and a search engine all agree on one moment rather
 * than each taking the date to mean something different.
 */
export const vacancyClosesAt = `${vacancy.closingDay}T23:59:59${SCHOOL_UTC_OFFSET}`;

export function vacancyOpen(on = new Date()) {
  return vacancy.active && on < new Date(vacancyClosesAt);
}

/**
 * Applications are invited continuously rather than against named posts, so
 * nothing here states a number of vacancies, pay or conditions. Sent to the
 * school's own address; a personal one would be scraped off a public page and
 * could not be withdrawn afterwards.
 */
export const careers = {
  title: "Teach at Walnut Academy",
  intro: `We teach children from ${classRange} in ${school.locality}, through activity and play rather than by rote.`,
  openTo:
    "We are glad to hear from teachers at any time of year, whether or not a post is advertised.",
  sendHeading: "What to send",
  send: [
    "Your CV",
    "Your highest qualification",
    "Years of teaching experience",
    "The classes or subjects you can teach",
  ],
  channelHeading: "How to apply",
  channelNote:
    "By email or on WhatsApp, whichever suits you. Both take a CV as an attachment.",
  mailSubject: "Teaching application",
  whatsappMessage:
    "Hello, I would like to apply to teach at Walnut Academy. I am sending my CV.",
  close:
    "We read everything that reaches us, and we get in touch with the teachers we would like to meet.",
} as const;

/**
 * Built once rather than at each place that offers them. The careers page and
 * the bar pinned to the foot of a phone both send an applicant to WhatsApp,
 * and an application is recognisable in the inbox only while whichever one was
 * tapped opens the same message.
 */
export const careersHref = {
  mail: `mailto:${contact.email}?subject=${encodeURIComponent(careers.mailSubject)}`,
  whatsapp: `${contact.whatsappHref}?text=${encodeURIComponent(careers.whatsappMessage)}`,
} as const;
