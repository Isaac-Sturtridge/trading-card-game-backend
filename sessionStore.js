/* abstract */ class SessionStore {
	findSession(id) {}
	saveSession(id, session) {}
	findAllSessions() {}
}

class InMemorySessionStore extends SessionStore {
	constructor() {
		super();
		this.sessions = new Map();
	}

	findUserID(socketID) {
		const entries = this.sessions.entries();
		for (const [key, value] of entries) {
			if (value['id'] === socketID) {
				return value['userID'];
			}
		}
	}

	findSession(id) {
		return this.sessions.get(id);
	}

	saveSession(id, session) {
		this.sessions.set(id, session);
	}

	findAllSessions() {
		return [...this.sessions.values()];
	}

	deleteSession(id) {
		this.sessions.delete(id);
	}
}

module.exports = {
	InMemorySessionStore,
};
