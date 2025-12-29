import { Analytics } from "./utils/supabase/info";

const testAnalytics: Analytics = {
  type: "example",
  totalResources: 10,
  totalBookings: 5,
  totalHours: 20,
};

console.log(testAnalytics);