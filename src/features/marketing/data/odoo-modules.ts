export type ModuleIconKey = "sales" | "crm" | "accounting" | "inventory" | "manufacturing" | "purchase" | "hr" | "website";

export type ModuleAccent = "primary" | "secondary" | "tertiary";

export type OdooModule = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  overview: string;
  icon: ModuleIconKey;
  accent: ModuleAccent;
  workflow: string[];
  skills: string[];
  relatedRoles: string[];
  relatedCourseSlugs: string[];
  status?: "available" | "planned";
};

export const odooModules: OdooModule[] = [
  {
    id: "sales",
    slug: "sales",
    name: "Sales",
    shortDescription: "Manage quotations, sales orders, pricing, deliveries and customer invoicing.",
    overview:
      "The Sales module runs the order-to-cash process — from a customer's first quotation through delivery and final invoicing — and connects directly into Inventory and Accounting.",
    icon: "sales",
    accent: "primary",
    workflow: ["Lead", "Quotation", "Sales Order", "Delivery", "Invoice"],
    skills: ["Customers", "Pricelists", "Quotations", "Sales Orders", "Delivery Flow"],
    relatedRoles: ["End User", "Functional Consultant", "Implementer"],
    relatedCourseSlugs: ["odoo-user-guide", "crash-course-odoo-erp", "odoo-implementation"],
    status: "available",
  },
  {
    id: "crm",
    slug: "crm",
    name: "CRM",
    shortDescription: "Manage leads, opportunities, activities, follow-ups and pipeline progress.",
    overview:
      "CRM tracks a prospect from first contact through to a won opportunity, giving sales teams a structured pipeline and a clear record of every follow-up along the way.",
    icon: "crm",
    accent: "secondary",
    workflow: ["Lead", "Opportunity", "Activity", "Quotation", "Customer"],
    skills: ["Leads", "Opportunities", "Activities", "Pipeline", "Follow-Ups"],
    relatedRoles: ["End User", "Sales User", "Functional Consultant"],
    relatedCourseSlugs: ["odoo-user-guide", "crash-course-odoo-erp", "odoo-implementation"],
    status: "available",
  },
  {
    id: "accounting",
    slug: "accounting",
    name: "Accounting",
    shortDescription: "Manage invoices, vendor bills, payments, journals and reconciliation.",
    overview:
      "Accounting handles the financial side of every transaction — issuing customer invoices, recording vendor bills, tracking payments, and reconciling journals against bank statements.",
    icon: "accounting",
    accent: "tertiary",
    workflow: ["Invoice", "Post", "Payment", "Reconciliation", "Reporting"],
    skills: ["Customer Invoices", "Vendor Bills", "Payments", "Journals", "Reconciliation"],
    relatedRoles: ["End User", "Accountant", "Functional Consultant", "Implementer"],
    relatedCourseSlugs: ["odoo-user-guide", "crash-course-odoo-erp", "odoo-implementation"],
    status: "available",
  },
  {
    id: "inventory",
    slug: "inventory",
    name: "Inventory",
    shortDescription: "Control products, warehouses, receipts, deliveries, routes and stock movements.",
    overview:
      "Inventory manages stock across warehouses — receiving goods, reserving them against orders, picking, and shipping — using configurable routes to match real operational flows.",
    icon: "inventory",
    accent: "primary",
    workflow: ["Receipt", "Storage", "Reservation", "Picking", "Delivery"],
    skills: ["Products", "Warehouses", "Stock Moves", "Receipts", "Deliveries", "Routes"],
    relatedRoles: ["End User", "Inventory User", "System Administrator", "Implementer"],
    relatedCourseSlugs: ["odoo-user-guide", "crash-course-odoo-erp", "odoo-implementation"],
    status: "available",
  },
  {
    id: "manufacturing",
    slug: "manufacturing",
    name: "Manufacturing",
    shortDescription: "Plan production using bills of materials, manufacturing orders and work orders.",
    overview:
      "Manufacturing turns a bill of materials into a production plan — scheduling manufacturing orders, tracking work orders through work centers, and recording finished goods.",
    icon: "manufacturing",
    accent: "secondary",
    workflow: ["Bill of Materials", "Manufacturing Order", "Work Orders", "Production", "Finished Goods"],
    skills: ["Bills of Materials", "Manufacturing Orders", "Work Centers", "Work Orders", "Production Planning"],
    relatedRoles: ["Manufacturing User", "Functional Consultant", "Implementer"],
    relatedCourseSlugs: ["odoo-implementation"],
    status: "available",
  },
  {
    id: "purchase",
    slug: "purchase",
    name: "Purchase",
    shortDescription: "Manage requests for quotation, purchase orders, receipts and vendor bills.",
    overview:
      "Purchase runs procurement from the first request for quotation through vendor negotiation, purchase orders, goods receipt, and the resulting vendor bill.",
    icon: "purchase",
    accent: "tertiary",
    workflow: ["Request for Quotation", "Purchase Order", "Receipt", "Vendor Bill", "Payment"],
    skills: ["Vendors", "RFQs", "Purchase Orders", "Product Receipts", "Vendor Bills"],
    relatedRoles: ["End User", "Purchase User", "Functional Consultant", "Implementer"],
    relatedCourseSlugs: ["odoo-user-guide", "odoo-implementation"],
    status: "available",
  },
  {
    id: "human-resources",
    slug: "human-resources",
    name: "Human Resources",
    shortDescription: "Organize employees, attendance, leave requests and essential HR operations.",
    overview:
      "Human Resources centralizes employee records, attendance, and time-off requests, with an approval flow that keeps managers and HR staff in sync.",
    icon: "hr",
    accent: "primary",
    workflow: ["Employee", "Attendance", "Leave Request", "Approval", "HR Reporting"],
    skills: ["Employees", "Departments", "Attendance", "Time Off", "Approvals"],
    relatedRoles: ["HR User", "System Administrator", "Implementer"],
    relatedCourseSlugs: ["odoo-user-guide", "odoo-system-admin", "odoo-implementation"],
    status: "available",
  },
  {
    id: "website-ecommerce",
    slug: "website-ecommerce",
    name: "Website and eCommerce",
    shortDescription: "Build connected website and online-sales experiences integrated with Odoo operations.",
    overview:
      "Website and eCommerce lets a business publish products online and take orders directly from the site, with every online order flowing straight into delivery and invoicing.",
    icon: "website",
    accent: "secondary",
    workflow: ["Product", "Website", "Cart", "Online Order", "Delivery", "Invoice"],
    skills: ["Website Pages", "Products", "eCommerce", "Online Orders", "Order Integration"],
    relatedRoles: ["Website User", "Developer", "Implementer"],
    relatedCourseSlugs: ["crash-course-odoo-erp", "odoo-implementation", "odoo-development"],
    status: "available",
  },
];
