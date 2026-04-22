import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function deepCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(deepCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toCamel(k), deepCamel(v)])
    );
  }
  return obj;
}

export const camelCaseInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map(event => {
      if (event instanceof HttpResponse && event.body) {
        return event.clone({ body: deepCamel(event.body) });
      }
      return event;
    })
  );
