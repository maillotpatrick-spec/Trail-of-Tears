import {
  teacherAuthorized,
  readAllEvents,
  aggregateEvents
} from '../_tracking-store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!teacherAuthorized(req)) {
    return res.status(401).json({ error: 'Invalid teacher code' });
  }

  try {
    const events = await readAllEvents();
    const students = aggregateEvents(events);

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      students,
      eventCount: events.length
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Could not read tracking data'
    });
  }
}
