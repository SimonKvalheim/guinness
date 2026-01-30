.PHONY: build build-prod build-dev push help

help:
	@echo "Available targets:"
	@echo "  make build        - Build Docker image with default tag"
	@echo "  make build-prod   - Build production Docker image (tagged as 'prod')"
	@echo "  make build-dev    - Build development Docker image (tagged as 'dev')"
	@echo "  make push         - Push Docker image to registry"

build:
	docker build -t guinness:latest .

build-prod:
	docker build -t guinness:prod .

build-dev:
	docker build -t guinness:dev .

push:
	docker push guinness:latest

delete:
	docker rmi guinness:latest || true
	docker rmi guinness:prod || true
	docker rmi guinness:dev || true
