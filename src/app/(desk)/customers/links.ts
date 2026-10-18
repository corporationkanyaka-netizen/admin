/** Link to a new enquiry with this customer's details filled in. */
export const newEnquiryHref = (c: { name: string; companyName: string; phone: string; email: string | null }) =>
  `/enquiries/new?${new URLSearchParams({ name: c.name, company: c.companyName, phone: c.phone, ...(c.email ? { email: c.email } : {}) })}`;
