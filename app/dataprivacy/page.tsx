export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <p className="mb-4 text-sm text-gray-600">
        <strong>Effective Date:</strong> 25.05.2025 <br />
        <strong>App Status:</strong> This is a <strong>demo app</strong> and <strong>proof of concept</strong>, created for testing purposes and to demonstrate functionality. It is not intended for production use.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. What This App Does</h2>
      <p className="mb-4">
        This app generates a personal daily briefing by combining your calendar events, personal notes, and emails you choose to send to it. The goal is to help you start your day with clarity.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. What Data We Collect</h2>
      <h3 className="font-semibold mb-1">Google Calendar</h3>
      <div className="mb-4">
        When you connect your Google Calendar:
        <ul className="list-disc ml-6 mt-1">
          <li>We access your events <strong>temporarily</strong> to generate your briefing.</li>
          <li><strong>We do not store any calendar data.</strong></li>
          <li>Events are processed in memory and discarded right after use.</li>
        </ul>
      </div>

      <h3 className="font-semibold mb-1">Personal Notes</h3>
      <p className="mb-4">
        You can optionally enter notes (e.g. reminders, routines, context). These are stored securely and used to improve the quality and relevance of your briefing.
      </p>

      <h3 className="font-semibold mb-1">Forwarded Emails</h3>
      <div className="mb-4">
        You can forward or send emails to your personal app address. We store:
        <ul className="list-disc ml-6 mt-1">
          <li>The <strong>subject</strong> and <strong>plain text body</strong></li>
          <li>No attachments, no metadata, no tracking</li>
        </ul>
        These messages are used as additional context for your daily briefing.
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. How Your Data Is Used</h2>
      <div className="mb-4">
        We only use your data to:
        <ul className="list-disc ml-6 mt-1">
          <li>Generate your daily briefing</li>
          <li>Show you previews and test briefings</li>
        </ul>
        We do <strong>not</strong>:
        <ul className="list-disc ml-6 mt-1">
          <li>Sell or share your data</li>
          <li>Use your data for advertising</li>
          <li>Track your behavior or usage</li>
        </ul>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Data Retention</h2>
      <div className="mb-4">
        <ul className="list-disc ml-6">
          <li><strong>Notes</strong> and <strong>forwarded emails</strong> are stored until you delete them or request removal.</li>
          <li><strong>Calendar data is never stored.</strong></li>
          <li>As this is a demo app, stored data may be deleted at any time without notice.</li>
        </ul>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. Data Security</h2>
      <div className="mb-4">
        Even as a demo, we take data security seriously:
        <ul className="list-disc ml-6 mt-1">
          <li>All data is encrypted in transit</li>
          <li>Stored notes and emails are secured and accessible only to you</li>
        </ul>
        However, as this is a <strong>proof of concept</strong>, you should avoid entering sensitive personal or business information.
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. Your Rights</h2>
      <div className="mb-4">
        You can:
        <ul className="list-disc ml-6 mt-1">
          <li>View, edit, or delete your data</li>
          <li>Request full data removal</li>
        </ul>
        To do so, click the Delete Account Button in your profile page and/or email me at: <a href="mailto:mot.reinert@gmail.com" className="text-blue-600 underline">mot.reinert@gmail.com</a>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-2">7. Questions?</h2>
      <p className="mb-4">
        This app is an experiment to explore how email, AI, and daily planning can work together.
        If you have any questions or concerns, please contact me at <a href="mailto:mot.reinert@gmail.com" className="text-blue-600 underline">mot.reinert@gmail.com</a>.
      </p>
    </div>
  );
}
