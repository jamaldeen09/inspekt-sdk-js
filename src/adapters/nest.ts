import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import Inspekt from '../core.js';

@Injectable()
class InspektInterceptor implements NestInterceptor {
    constructor(private readonly inspekt: Inspekt) { }

    /**
     * NestJS Interceptor implementation.
     * intercepts the execution stream to capture request and response data.
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        const response = httpContext.getResponse();

        // We use the RxJS 'tap' operator to look at the response 
        // without mutating the data being sent to the client.
        return next.handle().pipe(
            tap({
                next: (body) => {
                    // This runs in the background AFTER the controller returns
                    this.inspekt.backgroundAnalysis(request, response, body)
                },
                error: (err) => {
                    // Captures unhandled exceptions in the controller
                    this.inspekt.backgroundAnalysis(request, response, err)
                },
            }),
        );
    }
}

export default InspektInterceptor