
export async function getById(orgId: string) {
	// Stub: return dummy org details
	return { id: orgId, name: 'Dummy Org' };
}

export async function getAnalytics(orgId: string) {
	// Stub: return dummy analytics
	return { orgId, stats: {} };
}
