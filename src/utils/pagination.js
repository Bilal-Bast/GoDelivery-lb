function parseBoundedPagination(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
	const parsedPage = Number.parseInt(query.page, 10);
	const parsedLimit = Number.parseInt(query.limit, 10);
	const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
	const requestedLimit =
		Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : defaultLimit;
	const limit = Math.min(requestedLimit, maxLimit);
	return { page, limit, skip: (page - 1) * limit };
}

function paginationMeta({ page, limit, total }) {
	return {
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit),
	};
}

export { parseBoundedPagination, paginationMeta };
