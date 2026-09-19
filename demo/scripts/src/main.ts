interface User {
    name: string;
    age: number;
}

function greet(user: User): string {
    return `Hello, ${user.name}! You are ${user.age} years old.`;
}

const user: User = {
    name: "Nathan",
    age: 13
};

const message: string = greet(user);

console.log("[TS DEMO]", message);
