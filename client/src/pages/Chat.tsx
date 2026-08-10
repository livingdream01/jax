export default function Chat() {
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-jax-border px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-200">Chat with Jax</h2>
        <p className="text-sm text-gray-500">Your personal assistant — at your service, sir.</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-jax-blue/20 flex items-center justify-center text-jax-cyan text-sm font-bold shrink-0">
            J
          </div>
          <div className="bg-jax-surface border border-jax-border rounded-lg px-4 py-3 max-w-2xl">
            <p className="text-gray-300 text-sm">
              Good evening, sir. I am JAX, your personal assistant. I’m fully operational and ready to assist with research, news, automation, and anything else you might require. How may I be of service?
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-jax-border p-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Message Jax..."
            className="flex-1 bg-jax-surface border border-jax-border rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-jax-cyan transition-colors"
          />
          <button className="bg-jax-blue hover:bg-jax-cyan text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}