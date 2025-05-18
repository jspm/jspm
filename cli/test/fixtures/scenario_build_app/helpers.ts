interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

export class UserManager {
  private users: User[] = [];

  constructor(initialUsers: User[] = []) {
    this.users = initialUsers;
  }

  public addUser(user: User): void {
    this.users.push(user);
  }

  public getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  public getAllUsers(): User[] {
    return [...this.users];
  }

  public getActiveUsers(): User[] {
    return this.users.filter(user => user.isActive);
  }

  public updateUser(id: number, updates: Partial<User>): boolean {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;
    
    this.users[userIndex] = { ...this.users[userIndex], ...updates };
    return true;
  }

  public deleteUser(id: number): boolean {
    const initialLength = this.users.length;
    this.users = this.users.filter(user => user.id !== id);
    return this.users.length !== initialLength;
  }
}

export const createDemoUsers = (): User[] => {
  return [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com', isActive: true },
    { id: 2, name: 'Bob Johnson', email: 'bob@example.com', isActive: false },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', isActive: true }
  ];
};

export const TYPESCRIPT_VERSION = '5.0.4';