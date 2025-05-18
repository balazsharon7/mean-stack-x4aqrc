// src/app/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from "@angular/common/http"
import { inject } from "@angular/core"
import { PLATFORM_ID } from "@angular/core"
import { isPlatformBrowser } from "@angular/common"
import { AuthService } from "../services/auth.service"

export const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService)
  const platformId = inject(PLATFORM_ID)

  // Only add the auth token if we're in a browser environment
  if (isPlatformBrowser(platformId)) {
    const token = authService.getAuthToken()

    if (token) {
      // Log the request for debugging
      console.log(`Adding auth token to request: ${req.url}`)

      const authRequest = req.clone({
        headers: req.headers.set("auth-token", token),
      })
      return next(authRequest)
    }
  }

  return next(req)
}
