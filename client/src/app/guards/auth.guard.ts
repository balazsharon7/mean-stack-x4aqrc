import { Injectable } from "@angular/core"
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from "@angular/router"
import {  Observable, map, take } from "rxjs"
import { AuthService } from "../services/auth.service"

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
    // Use the isLoggedIn$ Observable to subscribe
    return this.authService.isLoggedIn$.pipe(
      take(1),
      map((isLoggedIn) => {
        if (isLoggedIn) {
          return true
        } else {
          this.router.navigate(["/login"], { queryParams: { returnUrl: state.url } })
          return false
        }
      }),
    )
  }
}
export { AuthService }
