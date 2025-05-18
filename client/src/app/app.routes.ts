// client/src/app/app.routes.ts
import type { Routes } from "@angular/router"
import { LoginComponent } from "./components/login/login.component"
import { DashboardComponent } from "./components/dashboard.component/dashboard.component"
import { AuthGuard } from "./guards/auth.guard"
import { FriendsComponent } from "./components/friends.component/friends.component"
import { HomeComponent } from "./components/home.component/home.component"
import { ProfileComponent } from "./components/profile/profile.component"
import { MessagesComponent } from "./components/message/message.component"

export const routes: Routes = [
  { path: "", redirectTo: "/login", pathMatch: "full" },
  { path: "login", component: LoginComponent, title: "Login" },
  {
    path: "dashboard",
    component: DashboardComponent,
    canActivate: [AuthGuard],
    children: [
      { path: "", redirectTo: "home", pathMatch: "full" },
      { path: "home", component: HomeComponent },
      { path: "profile", component: ProfileComponent },
      { path: "messages", component: MessagesComponent },
      { path: "friends", component: FriendsComponent },
    ],
  },
  { path: "**", redirectTo: "/login" },
]
