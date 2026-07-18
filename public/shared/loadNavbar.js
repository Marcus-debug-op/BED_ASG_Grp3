export async function loadNavbar() {
  const res = await fetch("/shared/navbar.html");
  const html = await res.text();
  document.body.insertAdjacentHTML("afterbegin", html);
}