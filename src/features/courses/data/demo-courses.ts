

export const courses = [
  {
    name: "Crash Course Odoo ERP",
    image: "course-0.svg",
    description:
      "A practical, hands-on introduction to Odoo ERP and how it integrates business functions.",
    teacher: "Ahmed Raza",
    role: "Odoo Functional Consultant",
    rating: "4.7",
    time: "10h 46m",
    lessons: 10,
    category: "Functional",
  },
  {
    name: "Python Fundamentals",
    image: "course-1.svg",
    description:
      "Learn Python from scratch and build the skills for Odoo development with real-world examples.",
    teacher: "Usman Ali",
    role: "Software Engineer",
    rating: "4.6",
    time: "8h 20m",
    lessons: 12,
    category: "Technical",
  },
  {
    name: "Odoo Development",
    image: "course-2.svg",
    description:
      "Build custom modules, extend functionalities, and become an Odoo developer.",
    teacher: "Fahad Khan",
    role: "Odoo Technical Consultant",
    rating: "4.8",
    time: "12h 15m",
    lessons: 14,
    category: "Technical",
  },
  {
    name: "Odoo Implementation",
    image: "course-3.svg",
    description:
      "Learn the complete implementation process from planning to go-live with best practices.",
    teacher: "Bilal Hussain",
    role: "Implementation Consultant",
    rating: "4.5",
    time: "9h 30m",
    lessons: 11,
    category: "Functional",
  },
  {
    name: "Odoo User Guide",
    image: "course-4.svg",
    description:
      "A step-by-step guide to using Odoo for everyday business operations across all modules.",
    teacher: "Ahmed Raza",
    role: "Odoo Functional Consultant",
    rating: "4.6",
    time: "6h 10m",
    lessons: 10,
    category: "Beginner",
  },
  {
    name: "Odoo System Admin",
    image: "course-5.svg",
    description:
      "Learn how to install, configure, secure, and maintain your Odoo instance.",
    teacher: "Usman Ali",
    role: "System Administrator",
    rating: "4.7",
    time: "7h 40m",
    lessons: 11,
    category: "Technical",
  },
];

export type Course = (typeof courses)[number];

export const featuredCourse = courses[0];

export const lessonNames = [
  "Business Workflows & ERP",
  "Accounting",
  "CRM / Sales / Purchase / Inventory",
  "Business Case",
  "Final Assessment",
];
