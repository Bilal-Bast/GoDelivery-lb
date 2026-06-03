module.exports = {
	title: "GoDelivery-lb",
	tagline: "Admin dashboard and API for Go Delivery",
	url: "https://your-domain.com",
	baseUrl: "/",
	onBrokenLinks: "throw",
	onBrokenMarkdownLinks: "warn",
	favicon: "img/favicon.ico",
	organizationName: "your-org",
	projectName: "godelivery-lb",
	presets: [
		[
			"@docusaurus/preset-classic",
			{
				docs: {
					sidebarPath: require.resolve("./sidebars.js"),
					editUrl: "",
				},
				blog: false,
				theme: {
					customCss: require.resolve("./src/css/custom.css"),
				},
			},
		],
	],
};
