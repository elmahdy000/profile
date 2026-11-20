/// Result Pattern for type-safe error handling across Repositories & ViewModels
sealed class Result<T> {
  const Result();

  bool get isSuccess => this is Success<T>;
  bool get isFailure => this is Failure<T>;

  T? get dataOrNull => switch (this) {
        Success(data: final d) => d,
        Failure() => null,
      };

  String? get errorOrNull => switch (this) {
        Success() => null,
        Failure(message: final m) => m,
      };

  R when<R>({
    required R Function(T data) onSuccess,
    required R Function(String message, int? statusCode) onFailure,
  }) {
    return switch (this) {
      Success(data: final d) => onSuccess(d),
      Failure(message: final m, statusCode: final code) => onFailure(m, code),
    };
  }
}

final class Success<T> extends Result<T> {
  const Success(this.data);
  final T data;
}

final class Failure<T> extends Result<T> {
  const Failure(this.message, [this.statusCode]);
  final String message;
  final int? statusCode;
}
