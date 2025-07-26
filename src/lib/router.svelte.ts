
const defaultRoute: string = 'home';

let currentRoute: string = $state(window.location.hash.slice(1) || defaultRoute);

window.addEventListener('hashchange', () => {
  currentRoute = window.location.hash.slice(1) || defaultRoute;
});

export function navigate(route: string): void {
  window.location.hash = route;
}

export function getCurrentRoute(): string {
  return currentRoute;
}

export function isRoute(route: string): boolean {
  return currentRoute === route;
}