class ErrorHandler extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public stack?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    if (stack) {
      this.stack = stack;
    }
  }
}

export default ErrorHandler;
