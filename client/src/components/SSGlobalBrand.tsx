/** Shared SS Global Tech Enterprises logo using the supplied brand artwork. */
export default function SSGlobalBrand({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center justify-center ${
        compact ? "h-16 w-44" : "w-full max-w-[300px]"
      }`}
    >
      <img
        src="/ss-global-tech-logo.png"
        alt="SS Global Tech Enterprises"
        className={`block h-auto w-full object-contain ${
          compact ? "max-h-16" : "max-h-32"
        }`}
      />
    </div>
  );
}
