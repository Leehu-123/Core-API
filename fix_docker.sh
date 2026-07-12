sed -i 's/RUN addgroup -g 1001 -S appgroup \&\& \\/RUN groupadd -g 1001 appgroup \&\& \\/g' Dockerfile
sed -i 's/    adduser -S appuser -u 1001 -G appgroup/    useradd -u 1001 -g appgroup -s \/bin\/false -m appuser/g' Dockerfile
