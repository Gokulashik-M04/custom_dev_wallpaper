const cursor = document.getElementById("cursor");
const info = document.getElementById("info");

window.addEventListener("mousemove", (e) => {

    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";

    info.innerHTML = `
        X : ${e.clientX}<br>
        Y : ${e.clientY}
    `;
});

window.addEventListener("mousedown", () => {
    cursor.style.background = "red";
});

window.addEventListener("mouseup", () => {
    cursor.style.background = "cyan";
});