const startOfDayUTC = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const startOfIsoWeekUTC = (date) => {
  const d = startOfDayUTC(date);
  const day = d.getUTCDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
};

const computePeriodStart = (frequency, date = new Date()) =>
  frequency === 'weekly' ? startOfIsoWeekUTC(date) : startOfDayUTC(date);

export { computePeriodStart };
