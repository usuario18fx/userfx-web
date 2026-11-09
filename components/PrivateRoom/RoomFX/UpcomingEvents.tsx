import { Icon } from "./shared";

// Retain the schedule shown in the existing PrivateRoom lobby.
export default function UpcomingEvents() {
  return (
<section className="ufx-events" aria-labelledby="ufx-events-title">
<div className="ufx-section-head">
<div>
<span>
THE NEXT SHARED MOMENT
</span>
<h2 id="ufx-events-title">
Upcoming events
</h2>
</div>
<Icon name="calendar" size={22} />
</div>
<article className="ufx-event">
<div className="ufx-event-date">
<span>
FRI
</span>
<strong>
22:00
</strong>
<small>
UTC
</small>
</div>
<div>
<span>
USER FX ROOM
</span>
<h3>
Private Friday Session
</h3>
<p>
Scheduled room · member access
</p>
</div>
</article>
</section>
  );
}
