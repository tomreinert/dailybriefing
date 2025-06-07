export interface MockCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
}

export interface MockEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
  calendar: string; // 'primary', 'work', or 'family'
}

// Mock calendars that simulate a user's Google Calendar setup
export const mockCalendars: MockCalendar[] = [
  {
    id: 'primary',
    summary: 'Personal',
    description: 'Your main calendar',
    primary: true,
  },
  {
    id: 'work',
    summary: 'Work',
    description: 'Work-related events',
  },
  {
    id: 'family',
    summary: 'Family',
    description: 'Family events and activities',
  },
];

// Generate mock events for the next few days
export function generateMockEvents(daysInAdvance: number = 7): MockEvent[] {
  const events: MockEvent[] = [];
  const now = new Date();
  
  // Create events for each day
  for (let day = 0; day < daysInAdvance; day++) {
    const currentDate = new Date(now);
    currentDate.setDate(now.getDate() + day);
    
    // Skip weekends for work events, but add weekend-specific activities
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (day === 0) { // Today
      events.push({
        id: `today-standup`,
        summary: 'Daily Standup',
        start: { dateTime: new Date(currentDate.setHours(9, 15)).toISOString() },
        end: { dateTime: new Date(currentDate.setHours(9, 45)).toISOString() },
        description: 'daily team sync - demo the new feature',
        calendar: 'work',
      });
      
      events.push({
        id: `today-beehive`,
        summary: 'Alex: check beehive',
        start: { dateTime: new Date(currentDate.setHours(17, 0)).toISOString() },
        end: { dateTime: new Date(currentDate.setHours(18, 0)).toISOString() },
        description: 'inspect frames, look for queen, harvest honey if ready',
        calendar: 'family',
      });
      
      events.push({
        id: `today-fermentation`,
        summary: 'Fermentation Club Meeting',
        start: { dateTime: new Date(currentDate.setHours(19, 30)).toISOString() },
        end: { dateTime: new Date(currentDate.setHours(21, 0)).toISOString() },
        description: 'trying to make tepache this week - bring pineapple rinds',
        calendar: 'primary',
      });
    }
    
    if (day === 1) { // Tomorrow
      events.push({
        id: `tomorrow-prod-issue`,
        summary: 'Production Issue Investigation',
        start: { dateTime: new Date(currentDate.setHours(10, 30)).toISOString() },
        end: { dateTime: new Date(currentDate.setHours(11, 30)).toISOString() },
        description: 'memory leak in payment service - pair with Sarah',
        calendar: 'work',
      });
      
      events.push({
        id: `tomorrow-dentist`,
        summary: 'Dental Appointment',
        start: { dateTime: new Date(currentDate.setHours(14, 30)).toISOString() },
        end: { dateTime: new Date(currentDate.setHours(15, 15)).toISOString() },
        description: 'regular cleaning with Dr. Chen',
        calendar: 'primary',
      });
      
      events.push({
        id: `tomorrow-robotics`,
        summary: "Rio's robotics comp",
        start: { dateTime: new Date(currentDate.setHours(18, 0)).toISOString() },
        end: { dateTime: new Date(currentDate.setHours(20, 0)).toISOString() },
        description: 'FIRST Lego League regional - remember extra batteries',
        calendar: 'family',
      });
    }
    
    if (day === 2) {
      if (!isWeekend) {
        events.push({
          id: `day2-code-review`,
          summary: 'Code Review Session',
          start: { dateTime: new Date(currentDate.setHours(14, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(15, 30)).toISOString() },
          description: 'review 3 PRs for the auth refactor',
          calendar: 'work',
        });
        
        events.push({
          id: `day2-geocache`,
          summary: 'geocaching w/ kids',
          start: { dateTime: new Date(currentDate.setHours(16, 30)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(18, 0)).toISOString() },
          description: 'trying the new cache near the water tower - difficulty 2.5',
          calendar: 'family',
        });
      } else {
        events.push({
          id: `day2-repair-cafe`,
          summary: 'Repair Café Volunteering',
          start: { dateTime: new Date(currentDate.setHours(10, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(13, 0)).toISOString() },
          description: 'help fix electronics and small appliances at community center',
          calendar: 'primary',
        });
        
        events.push({
          id: `day2-dinner-party`,
          summary: 'Alex: prep for dinner party',
          start: { dateTime: new Date(currentDate.setHours(15, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(17, 0)).toISOString() },
          description: 'grocery shopping and prep for neighbors coming over',
          calendar: 'family',
        });
      }
    }
    
    if (day === 3) {
      if (!isWeekend) {
        events.push({
          id: `day3-oncall`,
          summary: 'On-call Rotation Begins',
          start: { dateTime: new Date(currentDate.setHours(9, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(9, 15)).toISOString() },
          description: 'primary oncall for payment systems until Friday',
          calendar: 'work',
        });
        
        events.push({
          id: `day3-book-club`,
          summary: 'Book Club - "Klara and the Sun"',
          start: { dateTime: new Date(currentDate.setHours(19, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(20, 30)).toISOString() },
          description: 'monthly sci-fi book club at Sarah\'s house',
          calendar: 'primary',
        });
      } else {
        events.push({
          id: `day3-astronomy`,
          summary: 'Astronomy Club Meeting',
          start: { dateTime: new Date(currentDate.setHours(20, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(22, 30)).toISOString() },
          description: 'viewing Saturn and Jupiter through the club telescope',
          calendar: 'primary',
        });
        
        events.push({
          id: `day3-jazz-night`,
          summary: 'Maya & Alex: jazz night',
          start: { dateTime: new Date(currentDate.setHours(21, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(23, 0)).toISOString() },
          description: 'local quartet at Blue Moon - reserved table for 2',
          calendar: 'family',
        });
      }
    }
    
    if (day === 4) {
      if (!isWeekend) {
        events.push({
          id: `day4-sprint-planning`,
          summary: 'Sprint Planning Meeting',
          start: { dateTime: new Date(currentDate.setHours(13, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(14, 30)).toISOString() },
          description: 'Q4 planning - scope the checkout redesign',
          calendar: 'work',
        });
        
        events.push({
          id: `day4-therapy`,
          summary: 'Therapy Session',
          start: { dateTime: new Date(currentDate.setHours(17, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(17, 50)).toISOString() },
          description: 'weekly session with Dr. Martinez',
          calendar: 'primary',
        });
      } else {
        events.push({
          id: `day4-chickens`,
          summary: 'Alex: chicken coop maintenance',
          start: { dateTime: new Date(currentDate.setHours(8, 30)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(9, 30)).toISOString() },
          description: 'deep clean and fresh bedding - collect eggs',
          calendar: 'family',
        });
        
        events.push({
          id: `day4-yoga`,
          summary: 'Hot Yoga Class',
          start: { dateTime: new Date(currentDate.setHours(10, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(11, 15)).toISOString() },
          description: '90-minute Bikram class at Inner Fire Studio',
          calendar: 'primary',
        });
      }
    }
    
    if (day === 5) {
      if (!isWeekend) {
        events.push({
          id: `day5-deploy`,
          summary: 'Staging Deployment',
          start: { dateTime: new Date(currentDate.setHours(11, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(11, 30)).toISOString() },
          description: 'release 2.3.4 - test the new payment flow',
          calendar: 'work',
        });
        
        events.push({
          id: `day5-oil-change`,
          summary: 'Alex: car service',
          start: { dateTime: new Date(currentDate.setHours(12, 15)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(13, 0)).toISOString() },
          description: 'tire change and battery inspection at Mike\'s Auto',
          calendar: 'family',
        });
        
        events.push({
          id: `day5-wine-tasting`,
          summary: 'Wine Tasting w/ Jess',
          start: { dateTime: new Date(currentDate.setHours(19, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(21, 0)).toISOString() },
          description: 'natural wines at Vintage & Vine - trying the new Spanish selection',
          calendar: 'primary',
        });
      } else {
        events.push({
          id: `day5-farmers-market`,
          summary: 'Maya: farmers market run',
          start: { dateTime: new Date(currentDate.setHours(9, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(10, 30)).toISOString() },
          description: 'get vegetables for the week + coffee with vendor friends',
          calendar: 'family',
        });
      }
    }
    
    if (day === 6) {
      if (!isWeekend) {
        events.push({
          id: `day6-retro`,
          summary: 'Sprint Retrospective',
          start: { dateTime: new Date(currentDate.setHours(15, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(16, 0)).toISOString() },
          description: 'what went well, what didn\'t - discuss the incident response',
          calendar: 'work',
        });
        
        events.push({
          id: `day6-pickup`,
          summary: 'pickup Zara',
          start: { dateTime: new Date(currentDate.setHours(17, 15)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(17, 45)).toISOString() },
          description: 'debate team practice ends at 5pm',
          calendar: 'family',
        });
      } else {
        events.push({
          id: `day6-pottery`,
          summary: 'Pottery Class',
          start: { dateTime: new Date(currentDate.setHours(11, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(13, 0)).toISOString() },
          description: 'working on glazing techniques with instructor Kim',
          calendar: 'primary',
        });
        
        events.push({
          id: `day6-remember`,
          summary: 'remember: sourdough starter',
          start: { dateTime: new Date(currentDate.setHours(16, 0)).toISOString() },
          end: { dateTime: new Date(currentDate.setHours(16, 15)).toISOString() },
          description: 'feed the starter - making pizza dough tomorrow',
          calendar: 'family',
        });
      }
    }
  }
  
  // Add some all-day events
  if (daysInAdvance >= 3) {
    const allDayDate = new Date(now);
    allDayDate.setDate(now.getDate() + 2);
    // Only add work focus day if it's not a weekend
    const isAllDayWeekend = allDayDate.getDay() === 0 || allDayDate.getDay() === 6;
    if (!isAllDayWeekend) {
      events.push({
        id: `allday-wfh`,
        summary: 'Focus Day - Database Migration',
        start: { date: allDayDate.toISOString().split('T')[0] },
        end: { date: allDayDate.toISOString().split('T')[0] },
        description: 'no meetings scheduled - tackling the database migration',
        calendar: 'work',
      });
    }
  }
  
  if (daysInAdvance >= 5) {
    const schoolDate = new Date(now);
    schoolDate.setDate(now.getDate() + 4);
    events.push({
      id: `allday-climate-action`,
      summary: 'Climate Action Day',
      start: { date: schoolDate.toISOString().split('T')[0] },
      end: { date: schoolDate.toISOString().split('T')[0] },
      description: 'kids organizing bike-to-school campaign and tree planting',
      calendar: 'family',
    });
  }
  
  return events.sort((a, b) => {
    const aTime = a.start.dateTime || a.start.date || '';
    const bTime = b.start.dateTime || b.start.date || '';
    return aTime.localeCompare(bTime);
  });
}

export function getMockCalendars(): MockCalendar[] {
  return mockCalendars;
}

export function getMockEvents(selectedCalendars: string[], daysInAdvance: number): MockEvent[] {
  const allEvents = generateMockEvents(daysInAdvance);
  
  // Filter events based on selected calendars
  return allEvents.filter(event => selectedCalendars.includes(event.calendar));
}

// Mock context snippets for GitHub demo users
export const mockContextSnippets = [
  {
    content: "Adults: Maya (me), Alex (partner)",
    active: true,
  },
  {
    content: "Kids: Rio (12, robotics enthusiast), Sam (8, loves geocaching)",
    active: true,
  },
  {
    content: "I usually work Monday to Thursday, remote on Fridays",
    active: true,
  },
  {
    content: "Maya teaches at the university - busy during semester, more flexible in summer",
    active: true,
  },
  {
    content: "Alex picks up kids from school at 3:30pm on weekdays",
    active: true,
  },
  {
    content: "On Fridays, I usually pick up kids from school.",
    active: true,
  }
];

// Function to get mock context snippets for seeding
export function getMockContextSnippets() {
  return mockContextSnippets;
} 